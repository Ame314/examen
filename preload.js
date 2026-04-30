const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  verifyExit: (password) => ipcRenderer.invoke('verify-exit', password),
  onShowExitDialog: (callback) => ipcRenderer.on('show-exit-dialog', (_event, value) => callback())
});
