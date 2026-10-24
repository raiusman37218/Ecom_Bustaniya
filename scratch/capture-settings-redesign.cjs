const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function captureSettingsRedesign() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9355;
  const tempDir = path.join(__dirname, "chrome-profile-settings-v2-" + Date.now());
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

    await sendCommand("Page.navigate", { url: "http://localhost:3000/admin?section=Settings" });

    // Wait for the new shopifySettingsWorkspace to render
    console.log("Waiting for Settings workspace...");
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `Boolean(document.querySelector('.shopifySettingsWorkspace, .shopifySettingsLayout'))`
      });
      if (res && res.result && res.result.value) {
        console.log("Settings workspace rendered!");
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1200));

    // 1. Capture Store tab (default)
    const shotStore = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/settings-store-redesign.png", Buffer.from(shotStore.data, "base64"));
    console.log("Saved scratch/settings-store-redesign.png");

    // 2. Click Payments tab
    console.log("Switching to Payments tab...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.shopifyNavItem'));
        const paymentsBtn = btns.find(b => b.textContent && b.textContent.includes('Payments'));
        if (paymentsBtn) paymentsBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 1000));

    const shotPayments = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/settings-payments-redesign.png", Buffer.from(shotPayments.data, "base64"));
    console.log("Saved scratch/settings-payments-redesign.png");

    // 3. Click Size Guide Matrix tab
    console.log("Switching to Size Guide Matrix tab...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.shopifyNavItem'));
        const sizeBtn = btns.find(b => b.textContent && b.textContent.includes('Size Guide'));
        if (sizeBtn) sizeBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 1000));

    const shotSize = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/settings-size-redesign.png", Buffer.from(shotSize.data, "base64"));
    console.log("Saved scratch/settings-size-redesign.png");

    // 4. Click Tracking tab
    console.log("Switching to Meta Pixel & CAPI tab...");
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.shopifyNavItem'));
        const trackBtn = btns.find(b => b.textContent && b.textContent.includes('Meta Pixel'));
        if (trackBtn) trackBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 1000));

    const shotTrack = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/settings-tracking-redesign.png", Buffer.from(shotTrack.data, "base64"));
    console.log("Saved scratch/settings-tracking-redesign.png");

    // 5. Test Saving: Click Save Settings button
    console.log("Testing Save Settings button click...");
    const saveRes = await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const saveBtn = document.querySelector('.shopifySettingsHeaderRight .shopifyBtnPrimary') || document.querySelector('.shopifySettingsBottomBar .shopifyBtnPrimary');
        if (saveBtn) {
          saveBtn.click();
          return true;
        }
        return false;
      })()`
    });
    console.log("Clicked save button:", saveRes);

    await new Promise((r) => setTimeout(r, 2000));

    // Check if saved pill appeared
    const checkSaved = await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const pill = document.querySelector('.shopifySavedPill');
        return pill ? pill.textContent.trim() : null;
      })()`
    });
    console.log("Save status pill:", checkSaved);

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

captureSettingsRedesign().catch(console.error);
