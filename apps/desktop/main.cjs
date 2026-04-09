const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");

const FRONTEND_URL = process.env.RECLAIM_FRONTEND_URL || "http://localhost:3000";
const ADMIN_URL = process.env.RECLAIM_ADMIN_URL || `${FRONTEND_URL}/admin`;
const RETRY_MAX = 20;
const RETRY_MAX_AFTER_BOOTSTRAP = 90;
const RETRY_INTERVAL_MS = 1000;

/**
 * Poll a URL until it becomes reachable.
 * We keep this small and explicit so operators can understand why app startup is waiting.
 */
function probeUrl(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const client = parsed.protocol === "https:" ? https : http;
      const request = client.request(
        {
          method: "GET",
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          timeout: 2500
        },
        (response) => {
          resolve(response.statusCode >= 200 && response.statusCode < 500);
        }
      );
      request.on("error", () => resolve(false));
      request.on("timeout", () => {
        request.destroy();
        resolve(false);
      });
      request.end();
    } catch {
      resolve(false);
    }
  });
}

async function waitForUrl(url, attempts, intervalMs) {
  for (let i = 0; i < attempts; i += 1) {
    const alive = await probeUrl(url);
    if (alive) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

function findStartScript() {
  const envPath = process.env.RECLAIM_START_SCRIPT;
  const exeDir = path.dirname(process.execPath);
  const candidates = [
    envPath,
    path.resolve(process.cwd(), "scripts", "windows", "start-maintenance.cmd"),
    path.resolve(process.cwd(), "..", "scripts", "windows", "start-maintenance.cmd"),
    path.resolve(exeDir, "..", "..", "scripts", "windows", "start-maintenance.cmd"),
    path.resolve(exeDir, "..", "..", "..", "scripts", "windows", "start-maintenance.cmd")
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function tryBootstrapServices() {
  const script = findStartScript();
  if (!script) {
    return { started: false, script: null };
  }

  try {
    const child = spawn("cmd.exe", ["/c", script, "-NoBrowser"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
    return { started: true, script };
  } catch {
    return { started: false, script };
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: "Reclaim 时间管家",
    autoHideMenuBar: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    // Prevent arbitrary external window open; keep navigation inside app shell.
    if (url.startsWith(FRONTEND_URL)) {
      return { action: "allow" };
    }
    return { action: "deny" };
  });

  return window;
}

app.whenReady().then(async () => {
  const window = createWindow();
  window.loadURL(`${ADMIN_URL}?from=desktop`);

  const reachable = await waitForUrl(FRONTEND_URL, RETRY_MAX, RETRY_INTERVAL_MS);
  if (reachable) {
    window.loadURL(FRONTEND_URL);
    return;
  }

  const bootstrap = tryBootstrapServices();
  if (bootstrap.started) {
    window.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        "<h2 style='font-family:Segoe UI'>正在启动本地服务...</h2><p>请稍候，应用将在服务就绪后自动进入。</p>"
      )}`
    );
    const reachableAfterBootstrap = await waitForUrl(FRONTEND_URL, RETRY_MAX_AFTER_BOOTSTRAP, RETRY_INTERVAL_MS);
    if (reachableAfterBootstrap) {
      window.loadURL(FRONTEND_URL);
      return;
    }
  }

  const detail = bootstrap.script
    ? `已尝试执行脚本：${bootstrap.script}\n请确认脚本可运行并已安装 Node/Python/PostgreSQL/Redis。`
    : "未找到 start-maintenance.cmd。请在项目目录运行 scripts/windows/start-maintenance.cmd。";

  await dialog.showMessageBox(window, {
    type: "warning",
    title: "服务未就绪",
    message: "未检测到前端服务（http://localhost:3000）。",
    detail
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
