const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function captureOrderDetail() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9339;
  const tempDir = path.join(__dirname, "chrome-profile-orderdetail-" + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1100",
    "http://localhost:3000/admin",
  ]);

  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        targets = await res.json();
        if (targets && targets.length > 0) break;
      } catch (e) {}
    }

    if (!targets || !targets.length) throw new Error("Could not connect to Chrome debugging port");
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

    await sendCommand("Page.navigate", { url: "http://localhost:3000/admin" });
    await new Promise((r) => setTimeout(r, 3000));

    // Click Orders
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const ordersBtn = buttons.find(b => b.textContent && b.textContent.trim().startsWith('Orders'));
        if (ordersBtn) ordersBtn.click();
      })()`
    });

    // Wait for orders table to load
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `Boolean(document.querySelector('.shopifyOrderRow, .shopifyOrderNumLink, .shopifyRowBtn'))`
      });
      if (res && res.result && res.result.value) break;
    }

    // Click first order row view button or order link
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const orderLink = document.querySelector('.shopifyOrderNumLink, .shopifyRowBtn.primary');
        if (orderLink) orderLink.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 1500));

    const shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/order-detail-current.png", Buffer.from(shot.data, "base64"));
    console.log("Order detail screenshot saved to scratch/order-detail-current.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

captureOrderDetail().catch(console.error);
