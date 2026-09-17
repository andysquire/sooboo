const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // File operations. `data` is the JSON-serialisable chart document.
  saveChart: (data, filePath) => ipcRenderer.invoke("chart:save", data, filePath),
  saveChartAs: (data) => ipcRenderer.invoke("chart:save-as", data),
  openChart: () => ipcRenderer.invoke("chart:open"),
  exportCsv: (csv, suggestedName) => ipcRenderer.invoke("chart:export-csv", csv, suggestedName),

  // Window / app state
  setEdited: (isEdited) => ipcRenderer.send("window:set-edited", isEdited),
  setTitleFile: (filePath) => ipcRenderer.send("window:set-title-file", filePath),

  // Menu -> renderer commands
  onMenuAction: (callback) => {
    const channels = [
      "menu:new-chart",
      "menu:open-chart",
      "menu:save-chart",
      "menu:save-chart-as",
      "menu:export-csv",
    ];
    const listeners = channels.map((channel) => {
      const listener = () => callback(channel);
      ipcRenderer.on(channel, listener);
      return { channel, listener };
    });
    return () => {
      listeners.forEach(({ channel, listener }) => ipcRenderer.removeListener(channel, listener));
    };
  },

  // Close-confirmation handshake (unsaved changes guard)
  onBeforeClose: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("app:before-close", listener);
    return () => ipcRenderer.removeListener("app:before-close", listener);
  },
  respondBeforeClose: (hasUnsavedChanges) =>
    ipcRenderer.send("app:before-close-response", hasUnsavedChanges),
  proceedSaveThenClose: (data, filePath) =>
    ipcRenderer.invoke("chart:save-then-close", data, filePath),
  onSaveAndClose: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("app:save-and-close", listener);
    return () => ipcRenderer.removeListener("app:save-and-close", listener);
  },
});
