const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function testSave() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9360;
  const tempDir = path.join(__dirname, "chrome-profile-test-save-" + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1100",
    "http://localhost:3000/admin?section=Settings",
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

    await sendCommand("Page.navigate", { url: "http://localhost:3000/admin?section=Settings" });

    // Wait for the settings page to render
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `Boolean(document.querySelector('.shopifySettingsWorkspace'))`
      });
      if (res && res.result && res.result.value) break;
    }

    await new Promise((r) => setTimeout(r, 1500));

    // Capture resting state
    const restingShot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/settings-resting.png", Buffer.from(restingShot.data, "base64"));
    console.log("Saved scratch/settings-resting.png");

    // Click Save Settings button in header
    console.log("Clicking Save Settings in header...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('.shopifySettingsHeaderRight .shopifyBtnPrimary');
        if (btn) btn.click();
      })()`
    });

    // Wait for save to complete (wait up to 10s for saved pill)
    let savedPillText = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const check = await sendCommand("Runtime.evaluate", {
        expression: `(() => {
          const pill = document.querySelector('.shopifySavedPill');
          return pill ? pill.textContent.trim() : null;
        })()`
      });
      if (check && check.result && check.result.value) {
        savedPillText = check.result.value;
        console.log("Found saved pill:", savedPillText);
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 800));

    // Capture after-save state
    const afterShot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/settings-after-save.png", Buffer.from(afterShot.data, "base64"));
    console.log("Saved scratch/settings-after-save.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

testSave().catch(console.error);
