// src/electron/main.ts
import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

// ESM version of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true, // 👌 สวยขึ้น มากเหมือน native app
    webPreferences: {
      preload: path.join(__dirname, "../dist-electron/preload.js"),
      contextIsolation: true, // 👍 Safety for ESM + preload
      nodeIntegration: false, // ป้องกัน RCE
      sandbox: true,          // เพิ่มความปลอดภัย
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173/");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    console.log("Loading production index:", indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// macOS behavior
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});