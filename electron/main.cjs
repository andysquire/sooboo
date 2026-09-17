const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const isDev = process.env.NODE_ENV === "development";

/** @type {BrowserWindow | null} */
let mainWindow = null;
// Set once the renderer confirms it is safe to close (no unsaved changes,
// or the user chose to discard/save them). Reset on every fresh close attempt.
let closeConfirmed = false;

function baseName(filePath) {
  return filePath ? path.basename(filePath) : "Untitled Chart";
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 820,
    minHeight: 560,
    title: "SUBU Org Chart",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#f4f2fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("close", (event) => {
    if (closeConfirmed) return;
    event.preventDefault();
    mainWindow.webContents.send("app:before-close");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

async function writeChartFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function pickSavePath(defaultName) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save Org Chart",
    defaultPath: defaultName || "SUBU Org Chart.subuorg.json",
    filters: [{ name: "SUBU Org Chart", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
}

ipcMain.handle("chart:save", async (_event, data, filePath) => {
  try {
    let target = filePath;
    if (!target) {
      target = await pickSavePath();
      if (!target) return { canceled: true };
    }
    await writeChartFile(target, data);
    mainWindow?.setRepresentedFilename(target);
    mainWindow?.setTitle(`SUBU Org Chart — ${baseName(target)}`);
    return { canceled: false, filePath: target };
  } catch (err) {
    dialog.showErrorBox("Couldn't save chart", String(err && err.message ? err.message : err));
    return { canceled: true, error: true };
  }
});

ipcMain.handle("chart:save-as", async (_event, data) => {
  try {
    const target = await pickSavePath();
    if (!target) return { canceled: true };
    await writeChartFile(target, data);
    mainWindow?.setRepresentedFilename(target);
    mainWindow?.setTitle(`SUBU Org Chart — ${baseName(target)}`);
    return { canceled: false, filePath: target };
  } catch (err) {
    dialog.showErrorBox("Couldn't save chart", String(err && err.message ? err.message : err));
    return { canceled: true, error: true };
  }
});

ipcMain.handle("chart:open", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Open Org Chart",
      properties: ["openFile"],
      filters: [
        { name: "SUBU Org Chart", extensions: ["json"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const filePath = result.filePaths[0];
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    mainWindow?.setRepresentedFilename(filePath);
    mainWindow?.setTitle(`SUBU Org Chart — ${baseName(filePath)}`);
    return { canceled: false, filePath, data };
  } catch (err) {
    dialog.showErrorBox("Couldn't open chart", String(err && err.message ? err.message : err));
    return { canceled: true, error: true };
  }
});

ipcMain.handle("chart:export-csv", async (_event, csv, suggestedName) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export as CSV",
      defaultPath: suggestedName || "SUBU Org Chart.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, csv, "utf-8");
    return { canceled: false, filePath: result.filePath };
  } catch (err) {
    dialog.showErrorBox("Couldn't export CSV", String(err && err.message ? err.message : err));
    return { canceled: true, error: true };
  }
});

ipcMain.handle("chart:save-then-close", async (_event, data, filePath) => {
  try {
    let target = filePath;
    if (!target) {
      target = await pickSavePath();
      if (!target) return { canceled: true };
    }
    await writeChartFile(target, data);
    closeConfirmed = true;
    mainWindow?.close();
    return { canceled: false, filePath: target };
  } catch (err) {
    dialog.showErrorBox("Couldn't save chart", String(err && err.message ? err.message : err));
    return { canceled: true, error: true };
  }
});

ipcMain.on("window:set-edited", (_event, isEdited) => {
  mainWindow?.setDocumentEdited(Boolean(isEdited));
});

ipcMain.on("window:set-title-file", (_event, filePath) => {
  mainWindow?.setTitle(`SUBU Org Chart — ${baseName(filePath)}`);
});

ipcMain.on("app:before-close-response", async (_event, hasUnsavedChanges) => {
  if (!hasUnsavedChanges) {
    closeConfirmed = true;
    mainWindow?.close();
    return;
  }

  const choice = await dialog.showMessageBox(mainWindow, {
    type: "warning",
    buttons: ["Save", "Don't Save", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    message: "Do you want to save the changes to this org chart?",
    detail: "Your changes will be lost if you don't save them.",
  });

  if (choice.response === 2) {
    // Cancel — do nothing, leave the window open.
    return;
  }
  if (choice.response === 1) {
    // Don't Save
    closeConfirmed = true;
    mainWindow?.close();
    return;
  }
  // Save — ask the renderer to hand over its current data via the
  // save-then-close channel, triggered from the renderer's own handler.
  mainWindow?.webContents.send("app:save-and-close");
});

function buildMenu() {
  const isMac = process.platform === "darwin";

  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Chart",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.webContents.send("menu:new-chart"),
        },
        {
          label: "Open…",
          accelerator: "CmdOrCtrl+O",
          click: () => mainWindow?.webContents.send("menu:open-chart"),
        },
        { type: "separator" },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: () => mainWindow?.webContents.send("menu:save-chart"),
        },
        {
          label: "Save As…",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => mainWindow?.webContents.send("menu:save-chart-as"),
        },
        { type: "separator" },
        {
          label: "Export as CSV…",
          click: () => mainWindow?.webContents.send("menu:export-csv"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(isDev ? [{ type: "separator" }, { role: "toggleDevTools" }] : []),
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, ...(isMac ? [{ type: "separator" }, { role: "front" }] : [{ role: "close" }])],
    },
    {
      role: "help",
      submenu: [
        {
          label: "SUBU Website",
          click: async () => {
            await shell.openExternal("https://www.subu.org.uk");
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
