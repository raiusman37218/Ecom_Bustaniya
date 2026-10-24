const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/musma/.gemini/antigravity/brain/238b404a-52f8-4356-a6e2-4b3faad8a93c";

async function captureCategoriesWalkthrough() {
  const cookie = fs.readFileSync("scratch/cookie.txt", "utf8").trim();
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9397;
  const tempDir = path.join(__dirname, "chrome-profile-categories-redesign-3-" + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1100",
    "http://localhost:3000/admin?section=Categories",
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

    await sendCommand("Page.navigate", { url: "http://localhost:3000/admin?section=Categories" });

    // Wait until admin categories API has returned and populated subcategories count > 0
    for (let i = 0; i < 30; i++) {
      const res = await sendCommand("Runtime.evaluate", {
        expression: `(() => {
          const stats = Array.from(document.querySelectorAll('.shopifyCategoryStatInfo b'));
          return stats.length >= 2 && stats[1].textContent !== '0';
        })()`,
      });
      if (res?.result?.value) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await new Promise((r) => setTimeout(r, 800));

    // 1. Capture Tree View with Kurtis expanded and subcategories in clean one-line layout
    let shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/categories-shopify-tree.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "categories-shopify-tree.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved categories-shopify-tree.png");

    // 2. Click Table View
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.shopifyViewModeBtn'));
        const tableBtn = btns.find(b => b.textContent.includes('Table'));
        if (tableBtn) tableBtn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 600));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/categories-shopify-table.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "categories-shopify-table.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved categories-shopify-table.png");

    // 3. Click Tree view again, open Edit on Kurtis
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.shopifyViewModeBtn'));
        const treeBtn = btns.find(b => b.textContent.includes('Tree'));
        if (treeBtn) treeBtn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 500));

    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const editBtns = Array.from(document.querySelectorAll('.shopifyCategoryCard .shopifyActionBtn'));
        const editBtn = editBtns.find(b => b.textContent.includes('Edit'));
        if (editBtn) editBtn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 600));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/categories-shopify-modal.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "categories-shopify-modal.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved categories-shopify-modal.png");

    // Scroll modal body down to show SEO & Google Preview
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const modalBody = document.querySelector('.shopifyCategoryModalBody');
        if (modalBody) modalBody.scrollTop = modalBody.scrollHeight;
      })()`,
    });
    await new Promise((r) => setTimeout(r, 500));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/categories-shopify-modal-seo.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "categories-shopify-modal-seo.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved categories-shopify-modal-seo.png");

    // Close modal
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const cancelBtn = Array.from(document.querySelectorAll('.shopifySecondaryBtn')).find(b => b.textContent.includes('Cancel'));
        if (cancelBtn) cancelBtn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 500));

    // 4. Click Archived Tab
    await sendCommand("Runtime.evaluate", {
      expression: `(() => {
        const tabBtns = Array.from(document.querySelectorAll('.shopifyCategoryTabBtn'));
        const archBtn = tabBtns.find(b => b.textContent.includes('Archived'));
        if (archBtn) archBtn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 600));

    shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("scratch/categories-shopify-archived.png", Buffer.from(shot.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "categories-shopify-archived.png"), Buffer.from(shot.data, "base64"));
    console.log("Saved categories-shopify-archived.png");

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

captureCategoriesWalkthrough().catch(console.error);
