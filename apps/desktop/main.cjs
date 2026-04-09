const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");

const FRONTEND_URL = process.env.RECLAIM_FRONTEND_URL || "http://localhost:3000";
const OPS_URL = process.env.RECLAIM_OPS_URL || `${FRONTEND_URL}/ops`;
const RETRY_INTERVAL_MS = 1000;
const RETRY_BEFORE_BOOTSTRAP = 20;
const RETRY_AFTER_BOOTSTRAP = 90;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toUrlObject(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function probeUrl(url) {
  return new Promise((resolve) => {
    const parsed = toUrlObject(url);
    if (!parsed) {
      resolve(false);
      return;
    }

    const client = parsed.protocol === "https:" ? https : http;
    const req = client.request(
      {
        method: "GET",
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        timeout: 2500
      },
      (res) => {
        resolve((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 500);
      }
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function waitForUrl(url, maxAttempts) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const alive = await probeUrl(url);
    if (alive) return true;
    await sleep(RETRY_INTERVAL_MS);
  }
  return false;
}

function candidateStartScripts() {
  const exeDir = path.dirname(process.execPath);
  const envPath = process.env.RECLAIM_START_SCRIPT;

  return [
    envPath,
    path.resolve(process.cwd(), "scripts", "windows", "start-maintenance.cmd"),
    path.resolve(process.cwd(), "..", "scripts", "windows", "start-maintenance.cmd"),
    path.resolve(exeDir, "scripts", "windows", "start-maintenance.cmd"),
    path.resolve(exeDir, "..", "scripts", "windows", "start-maintenance.cmd"),
    path.resolve(exeDir, "..", "..", "scripts", "windows", "start-maintenance.cmd"),
    path.resolve(exeDir, "..", "..", "..", "scripts", "windows", "start-maintenance.cmd")
  ].filter(Boolean);
}

function findStartScript() {
  const found = candidateStartScripts().find((p) => fs.existsSync(p));
  return found || null;
}

function tryBootstrapServices() {
  const script = findStartScript();
  if (!script) {
    return { started: false, script: null, reason: "missing_script" };
  }

  try {
    const child = spawn("cmd.exe", ["/c", script, "-NoBrowser"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
    return { started: true, script, reason: null };
  } catch {
    return { started: false, script, reason: "spawn_failed" };
  }
}

function loadingHtml(message) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(
    `<html><body style="font-family:Segoe UI;padding:24px;background:#f8fafc;color:#0f172a"><h2>${message}</h2><p>The app is connecting to local services. Please wait.</p></body></html>`
  )}`;
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: "Reclaim Time Manager",
    autoHideMenuBar: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(FRONTEND_URL)) return { action: "allow" };
    return { action: "deny" };
  });

  win.webContents.on("render-process-gone", async () => {
    const ok = await probeUrl(FRONTEND_URL);
    if (ok) win.loadURL(FRONTEND_URL);
  });

  win.on("unresponsive", async () => {
    const ok = await probeUrl(FRONTEND_URL);
    if (ok) win.reload();
  });

  return win;
}

async function ensureFrontendReady(win) {
  win.loadURL(loadingHtml("Connecting local services..."));

  const reachable = await waitForUrl(FRONTEND_URL, RETRY_BEFORE_BOOTSTRAP);
  if (reachable) {
    await win.loadURL(FRONTEND_URL);
    return true;
  }

  const boot = tryBootstrapServices();
  if (boot.started) {
    win.loadURL(loadingHtml("Starting local services..."));
    const ready = await waitForUrl(FRONTEND_URL, RETRY_AFTER_BOOTSTRAP);
    if (ready) {
      await win.loadURL(FRONTEND_URL);
      return true;
    }
  }

  const detail = boot.script
    ? `Tried script:\n${boot.script}\n\nPlease confirm this script can run and Node/Python/PostgreSQL/Redis are installed.`
    : "Could not find start-maintenance.cmd. Run scripts/windows/start-maintenance.cmd in the project folder.";

  await dialog.showMessageBox(win, {
    type: "warning",
    title: "Services Not Ready",
    message: "Local frontend service is not available (http://localhost:3000).",
    detail
  });

  await win.loadURL(OPS_URL).catch(() => {});
  return false;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const focused = BrowserWindow.getAllWindows()[0];
    if (!focused) return;
    if (focused.isMinimized()) focused.restore();
    focused.focus();
  });

  app.whenReady().then(async () => {
    const win = createMainWindow();
    await ensureFrontendReady(win);
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
