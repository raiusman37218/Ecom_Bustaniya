const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/musma/.gemini/antigravity/brain/238b404a-52f8-4356-a6e2-4b3faad8a93c";

async function captureEventsTabs() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9399;
  const tempDir = path.join(__dirname, "chrome-profile-events-tabs-" + Date.now());
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
    for (let i = 0; i < 20; i++) {
      const res = await sendCommand("Runtime.evaluate", {
        expression: "Boolean(document.querySelector('.eventsWorkspace'))",
      });
      if (res?.result?.value) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await new Promise((r) => setTimeout(r, 1000));

    // 1. Click Live activity tab
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.eventsWorkspaceTabs button'));
        const tab = btns.find(b => b.textContent.includes('Live activity'));
        if (tab) tab.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 800));

    let shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/events-activity-current.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "events-activity-current.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved events-activity-current.png");

    // 2. Click Tests tab
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.eventsWorkspaceTabs button'));
        const tab = btns.find(b => b.textContent.includes('Tests'));
        if (tab) tab.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 800));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/events-tests-current.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "events-tests-current.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved events-tests-current.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

captureEventsTabs().catch(console.error);
