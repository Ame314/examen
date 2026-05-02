const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  verifyExit: (password) => ipcRenderer.invoke('verify-exit', password),
  onShowExitDialog: (callback) => ipcRenderer.on('show-exit-dialog', (_event, value) => callback()),
  onShowAlert: (callback) => ipcRenderer.on('show-alert', (_event, message) => callback(message)),
  getDB: () => ipcRenderer.invoke('db-get'),
  addQuestion: (q) => ipcRenderer.invoke('add-question', q),
  saveStudent: (student) => ipcRenderer.invoke('save-student', student)
});
