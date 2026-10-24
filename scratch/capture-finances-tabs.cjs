const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function captureTabs() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9380;
  const tempDir = path.join(__dirname, "chrome-profile-fin-tabs-" + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1100",
    "http://localhost:3000/admin?section=Finances",
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

    await sendCommand("Page.navigate", { url: "http://localhost:3000/admin?section=Finances" });

    // Wait until loaded
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `document.querySelectorAll('.shopifyFinanceKpiCard').length > 0`
      });
      if (res && res.result && res.result.value) break;
    }

    // 1. Click Profit & Loss tab
    console.log("Switching to Profit & Loss tab...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('.shopifyFinanceTab'));
        const pnlTab = tabs.find(t => t.innerText.includes('Profit & Loss'));
        if (pnlTab) pnlTab.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 800));
    let shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/finances-shopify-pnl.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/finances-shopify-pnl.png");

    // 2. Click Courier & Advances tab
    console.log("Switching to Courier & Advances tab...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('.shopifyFinanceTab'));
        const payTab = tabs.find(t => t.innerText.includes('Courier & Advances'));
        if (payTab) payTab.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 800));
    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/finances-shopify-courier-advances.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/finances-shopify-courier-advances.png");

    // 3. Click Reports & Analytics tab
    console.log("Switching to Reports & Analytics tab...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('.shopifyFinanceTab'));
        const repTab = tabs.find(t => t.innerText.includes('Reports & Analytics'));
        if (repTab) repTab.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 1200));
    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/finances-shopify-reports.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/finances-shopify-reports.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

captureTabs().catch(console.error);
