const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function run() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9345;
  const tempDir = path.join(__dirname, "chrome-profile-verify-" + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1050",
    "http://localhost:3000/admin",
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

    await sendCommand("Page.navigate", { url: "http://localhost:3000/admin" });

    // Step 1: Wait for sidebar navigation to appear
    console.log("Waiting for admin navigation...");
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 800));
      const res = await sendCommand("Runtime.evaluate", {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button, a'));
          const ordersBtn = btns.find(b => b.textContent && b.textContent.trim().startsWith('Orders'));
          if (ordersBtn) {
            ordersBtn.click();
            return true;
          }
          return false;
        })()`
      });
      if (res && res.result && res.result.value) {
        console.log("Clicked Orders tab in sidebar!");
        break;
      }
    }

    // Step 2: Wait for Orders to load (NOT loading state)
    console.log("Waiting for Orders data to load...");
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const check = await sendCommand("Runtime.evaluate", {
        expression: `(() => {
          const hasRows = document.querySelectorAll('.shopifyOrderRow').length > 0;
          const hasEmpty = document.querySelector('.shopifyEmptyState') !== null;
          const isLoading = document.body.innerText.includes('Loading orders from Supabase');
          return (!isLoading && (hasRows || hasEmpty));
        })()`
      });
      if (check && check.result && check.result.value) {
        console.log("Orders loaded completely!");
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1000));

    // Capture Orders List
    const ordersShot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/orders-current.png", Buffer.from(ordersShot.data, "base64"));
    console.log("Saved scratch/orders-current.png");

    // Step 3: Open an Order detail view
    console.log("Clicking first order to open details view...");
    const clickOrder = await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const orderNumLink = document.querySelector('.shopifyOrderNumLink') || document.querySelector('.shopifyRowBtn.primary');
        if (orderNumLink) {
          orderNumLink.click();
          return orderNumLink.textContent.trim();
        }
        return null;
      })()`
    });
    console.log("Clicked order link:", clickOrder);

    // Wait for Order Details view to load
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const checkDetail = await sendCommand("Runtime.evaluate", {
        expression: `Boolean(document.querySelector('.shopifyOrderGrid, .shopifyOrderTopBar, .shopifyCustomerProfile'))`
      });
      if (checkDetail && checkDetail.result && checkDetail.result.value) {
        console.log("Order Detail view rendered!");
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1200));

    // Capture Order Detail
    const detailShot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/order-detail-current.png", Buffer.from(detailShot.data, "base64"));
    console.log("Saved scratch/order-detail-current.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

run().catch(console.error);
