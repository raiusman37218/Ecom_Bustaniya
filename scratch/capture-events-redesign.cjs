const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/musma/.gemini/antigravity/brain/238b404a-52f8-4356-a6e2-4b3faad8a93c";

async function captureEventsRedesignWalkthrough() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9388;
  const tempDir = path.join(__dirname, "chrome-profile-events-redesign-" + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1100",
    "http://localhost:3000/admin?section=Events",
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

    await sendCommand("Page.navigate", { url: "http://localhost:3000/admin?section=Events" });

    // Wait until workspace finishes loading
    for (let i = 0; i < 30; i++) {
      const res = await sendCommand("Runtime.evaluate", {
        expression: "Boolean(document.querySelector('.eventsWorkspaceFunnel'))",
      });
      if (res?.result?.value) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await new Promise((r) => setTimeout(r, 1200));

    // 1. Capture Overview
    let shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/events-shopify-overview.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "events-shopify-overview.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved events-shopify-overview.png");

    // 2. Click Live Activity Tab
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.eventsWorkspaceTabs button'));
        const tab = btns.find(b => b.textContent.includes('Live Activity'));
        if (tab) tab.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1000));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/events-shopify-activity.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "events-shopify-activity.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved events-shopify-activity.png");

    // 3. Click on the first row to open Event Details Drawer
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const firstRow = document.querySelector('.eventsWorkspaceTable tbody tr');
        if (firstRow) firstRow.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 800));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/events-shopify-drawer.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "events-shopify-drawer.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved events-shopify-drawer.png");

    // Close drawer
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const closeBtn = document.querySelector('.eventsWorkspaceDrawerHead button');
        if (closeBtn) closeBtn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 500));

    // 4. Click Diagnostics & Tests Tab
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.eventsWorkspaceTabs button'));
        const tab = btns.find(b => b.textContent.includes('Diagnostics & Tests'));
        if (tab) tab.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 800));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/events-shopify-tests.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "events-shopify-tests.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved events-shopify-tests.png");

    // 5. Click "Test ViewContent" button to trigger a live test
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const testBtns = Array.from(document.querySelectorAll('.eventsWorkspaceTestBtn'));
        const btn = testBtns.find(b => b.textContent.includes('ViewContent')) || testBtns[0];
        if (btn) btn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 2500));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/events-shopify-tested.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "events-shopify-tested.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved events-shopify-tested.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

captureEventsRedesignWalkthrough().catch(console.error);
