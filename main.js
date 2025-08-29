const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
  }
}

app.whenReady().then(createWindow);

ipcMain.handle("select-csv-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
    properties: ["openFile"]
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, error: "No file selected" };
  }

  try {
    const data = fs.readFileSync(filePaths[0], "utf-8");
    return { success: true, data, fileName: path.basename(filePaths[0]) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
