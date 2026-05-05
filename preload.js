/**
 * Preload Script — Puente IPC Seguro (Context Bridge)
 * 
 * Expone una API segura a las vistas (renderer process).
 * Solo permite operaciones explícitamente definidas.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Autenticación y salida
    verifyExit: (password) => ipcRenderer.invoke('verify-exit', password),
    onShowExitDialog: (callback) => ipcRenderer.on('show-exit-dialog', () => callback()),
    onShowAlert: (callback) => ipcRenderer.on('show-alert', (_event, message) => callback(message)),

    // Base de datos
    getDB: () => ipcRenderer.invoke('db-get'),
    addQuestion: (q) => ipcRenderer.invoke('add-question', q),
    saveStudent: (student) => ipcRenderer.invoke('save-student', student),

    // Examen
    gradeExam: (data) => ipcRenderer.invoke('grade-exam', data),

    // Logs y Seguimiento
    setStudentName: (name) => ipcRenderer.send('set-student-name', name),
    addLog: (eventType, detail) => ipcRenderer.invoke('add-log', { eventType, detail })
});
