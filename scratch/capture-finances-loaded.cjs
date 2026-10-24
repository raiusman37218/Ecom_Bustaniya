const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function capture() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9370;
  const tempDir = path.join(__dirname, "chrome-profile-fin-loaded-" + Date.now());
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
    console.log("Waiting for finance numbers to load...");
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 800));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `(() => {
          const isLoading = document.body.innerText.includes('Numbers load ho rahe hain');
          const hasMetrics = document.querySelectorAll('.financeMetrics, .financeKpi, .statementRow, .miniMetricGrid').length > 0;
          const hasError = document.body.innerText.includes('Finance setup adhoora hai');
          return (!isLoading && (hasMetrics || hasError));
        })()`
      });
      if (res && res.result && res.result.value) {
        console.log("Finance report loaded!");
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1200));

    const shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/finances-loaded.png", Buffer.from(shot.data, "base64"));
    console.log("Saved scratch/finances-loaded.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

capture().catch(console.error);
