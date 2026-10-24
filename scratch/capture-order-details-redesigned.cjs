const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function captureOrderDetails() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9390;
  const tempDir = path.join(__dirname, "chrome-profile-order-det-" + Date.now());
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

    // Wait until orders load
    console.log("Waiting for orders table...");
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `document.querySelectorAll('.shopifyRowBtn.primary').length > 0`
      });
      if (res && res.result && res.result.value) {
        console.log("Orders loaded!");
        break;
      }
    }

    // Click "View" button on the first order
    console.log("Clicking View on first order...");
    const clickRes = await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const viewBtn = document.querySelector('.shopifyRowBtn.primary');
        if (viewBtn) {
          viewBtn.click();
          return "CLICKED";
        }
        return "NOT_FOUND";
      })()`,
      returnByValue: true
    });
    console.log("Click result:", clickRes?.result?.value);

    // Wait for drawer/modal
    console.log("Waiting for order modal container...");
    let modalOpened = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 400));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `document.querySelectorAll('.shopifyOrderModalContainer').length > 0`,
        returnByValue: true
      });
      if (res && res.result && res.result.value) {
        console.log("Order details modal opened!");
        modalOpened = true;
        break;
      }
    }

    if (!modalOpened) {
      console.error("ERROR: Modal container never opened!");
    }

    await new Promise((r) => setTimeout(r, 1000));

    // Capture top view
    let shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/order-details-redesigned-top.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/order-details-redesigned-top.png");

    // Scroll container down
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const modal = document.querySelector('.shopifyOrderModalOverlay');
        if (modal) modal.scrollTo({ top: 400, behavior: 'instant' });
      })()`
    });

    await new Promise((r) => setTimeout(r, 600));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/order-details-redesigned-scrolled.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/order-details-redesigned-scrolled.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

captureOrderDetails().catch(console.error);
