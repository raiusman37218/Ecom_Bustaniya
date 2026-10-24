const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function testToggle() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9392;
  const tempDir = path.join(__dirname, "chrome-profile-order-toggle-" + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1100",
    "http://localhost:3000/admin?section=Orders",
  ]);

  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        targets = await res.json();
        if (targets && targets.length > 0) break;
      } catch (e) {}
    }

    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === msgId) {
            ws.removeEventListener("message", handler);
            resolve(data.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await sendCommand("Network.enable");
    await sendCommand("Network.setCookie", {
      name: "bustaniya_admin_session",
      value: cookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
    });

    await sendCommand("Page.navigate", { url: "http://localhost:3000/admin?section=Orders" });

    // Wait for orders table
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `document.querySelectorAll('.shopifyRowBtn.primary').length > 0`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    // Click View on first order
    await sendCommand("Runtime.evaluate", {
      expression: `document.querySelector('.shopifyRowBtn.primary').click()`
    });

    // Wait for modal
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 400));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `document.querySelectorAll('.shopifyOrderModalContainer').length > 0`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    await new Promise((r) => setTimeout(r, 600));

    // Click "100% Prepaid" button in the segmented control
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('.shopifySegmentBtn'));
        const prepaidBtn = buttons.find(b => b.textContent.includes('Prepaid'));
        if (prepaidBtn) prepaidBtn.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 600));

    let shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/order-details-prepaid-clicked.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/order-details-prepaid-clicked.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

testToggle().catch(console.error);
