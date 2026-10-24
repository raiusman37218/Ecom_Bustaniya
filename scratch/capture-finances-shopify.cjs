const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function capture() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9375;
  const tempDir = path.join(__dirname, "chrome-profile-fin-shopify-" + Date.now());
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

    // Wait until numbers finish loading (i.e. report is ready)
    console.log("Waiting for finance workspace to load...");
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `(() => {
          const hasKpis = document.querySelectorAll('.shopifyFinanceKpiCard').length > 0;
          return hasKpis;
        })()`
      });
      if (res && res.result && res.result.value) {
        console.log("Finance workspace loaded!");
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1000));

    // Capture main view
    let shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/finances-shopify-overview.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/finances-shopify-overview.png");

    // Click Record Expense button
    console.log("Clicking Record Expense...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('.shopifyFinanceActionBtn.expense');
        if (btn) btn.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 600));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/finances-shopify-expense-modal.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/finances-shopify-expense-modal.png");

    // Close modal
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('.shopifyModalCancelBtn');
        if (btn) btn.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 400));

    // Click Transfer Funds button
    console.log("Clicking Transfer Funds...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('.shopifyFinanceActionBtn.transfer');
        if (btn) btn.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 600));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/finances-shopify-transfer-modal.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/finances-shopify-transfer-modal.png");

    // Close modal and switch to Cash & Accounts tab
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('.shopifyModalCancelBtn');
        if (btn) btn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 300));

    console.log("Switching to Cash & Accounts tab...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('.shopifyFinanceTab'));
        const cashTab = tabs.find(t => t.innerText.includes('Cash & Accounts'));
        if (cashTab) cashTab.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 800));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/finances-shopify-cash-ledger.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/finances-shopify-cash-ledger.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

capture().catch(console.error);
