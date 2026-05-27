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
    
    // Autenticación de usuarios
    verifyLogin: (username, password) => ipcRenderer.invoke('verify-login', { username, password }),

    // CRUD de exámenes
    addExam: (exam) => ipcRenderer.invoke('add-exam', exam),
    updateExam: (examId, updatedData) => ipcRenderer.invoke('update-exam', { examId, updatedData }),
    deleteExam: (examId) => ipcRenderer.invoke('delete-exam', examId),

    // CRUD de usuarios
    addUser: (user) => ipcRenderer.invoke('add-user', user),
    deleteUser: (userId) => ipcRenderer.invoke('delete-user', userId),

    // Base de datos
    getDB: () => ipcRenderer.invoke('db-get'),
    addQuestion: (q) => ipcRenderer.invoke('add-question', q),
    saveStudent: (student) => ipcRenderer.invoke('save-student', student),
    updateStudent: (studentId, updatedData) => ipcRenderer.invoke('update-student', { studentId, updatedData }),
    updateQuestion: (questionId, updatedData) => ipcRenderer.invoke('update-question', { questionId, updatedData }),
    deleteQuestion: (questionId) => ipcRenderer.invoke('delete-question', questionId),

    // Examen
    gradeExam: (data) => ipcRenderer.invoke('grade-exam', data),

    // Logs y Seguimiento
    setStudentName: (name) => ipcRenderer.send('set-student-name', name),
    addLog: (eventType, detail) => ipcRenderer.invoke('add-log', { eventType, detail })
});
