import { app, BrowserWindow, nativeTheme } from "electron";
import path from "node:path";

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

const createMainWindow = async (): Promise<BrowserWindow> => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#111827" : "#ffffff",
    title: "StudyNest",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  if (isDev && VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  return win;
};

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
