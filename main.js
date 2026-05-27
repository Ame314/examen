/**
 * Proceso Principal (main.js) — Orquestador MVC
 * 
 * Este archivo actúa como el punto de entrada de la aplicación Electron.
 * Delega la lógica de negocio a los Controladores y la persistencia al Modelo.
 * Solo se encarga de:
 *   - Configurar la ventana Electron (kiosk, seguridad)
 *   - Registrar IPC handlers que conectan Vista ↔ Controlador
 *   - Manejar atajos globales y seguridad del sistema
 */

require('dotenv').config();
const { app, BrowserWindow, globalShortcut, ipcMain, clipboard } = require('electron');
const path = require('path');

// ─── Importar capas MVC ──────────────────────────────────────
const Database = require('./models/Database');
const ExamController = require('./controllers/ExamController');
const AuthController = require('./controllers/AuthController');

// ─── Instanciar capas ────────────────────────────────────────
const db = new Database();
const examController = new ExamController(db);
const authController = new AuthController();

let blurTimeout = null;
let mainWindow;

// ═══════════════════════════════════════════════════════════════
// IPC HANDLERS — Conectan la Vista con los Controladores
// ═══════════════════════════════════════════════════════════════

// Obtener todos los datos (Vista necesita poblar las pantallas)
ipcMain.handle('db-get', () => examController.getAllData());

// Verificar login de usuarios
ipcMain.handle('verify-login', (event, { username, password }) => {
    return db.verifyLogin(username, password);
});

// CRUD de exámenes
ipcMain.handle('add-exam', (event, exam) => {
    return db.saveExam(exam);
});

ipcMain.handle('update-exam', (event, { examId, updatedData }) => {
    return db.updateExam(examId, updatedData);
});

ipcMain.handle('delete-exam', (event, examId) => {
    return db.deleteExam(examId);
});

// CRUD de usuarios
ipcMain.handle('add-user', (event, user) => {
    return db.saveUser(user);
});

ipcMain.handle('delete-user', (event, userId) => {
    return db.deleteUser(userId);
});

// Añadir pregunta (delegado al ExamController con validación)
ipcMain.handle('add-question', (event, question) => {
    return examController.addQuestion(question);
});

// Actualizar datos de pregunta
ipcMain.handle('update-question', (event, { questionId, updatedData }) => {
    return examController.updateQuestion(questionId, updatedData);
});

// Eliminar pregunta
ipcMain.handle('delete-question', (event, questionId) => {
    return examController.deleteQuestion(questionId);
});

// Guardar resultado de estudiante
ipcMain.handle('save-student', (event, student) => {
    db.saveStudent(student);
    return true;
});

// Actualizar datos de estudiante (edición)
ipcMain.handle('update-student', (event, { studentId, updatedData }) => {
    return examController.updateStudent(studentId, updatedData);
});

// Calificar examen completo
ipcMain.handle('grade-exam', (event, { studentName, answers, essay }) => {
    return examController.gradeExam(studentName, answers, essay);
});

// Verificar contraseña de salida (delegado al AuthController)
ipcMain.handle('verify-exit', (event, password) => {
    if (authController.verifyExit(password)) {
        app.isQuitting = true;
        app.quit();
        return true;
    }
    return false;
});

// Registrar log de actividad
ipcMain.handle('add-log', (event, { eventType, detail }) => {
    return db.addLog(eventType, detail);
});

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

let currentStudentName = 'Estudiante Anónimo';

ipcMain.on('set-student-name', (event, name) => {
    currentStudentName = name;
});

function guardarEnBDD(tipoEvento, detalle) {
    db.addLog(tipoEvento, `[${currentStudentName}] ${detalle}`);
}

// Disable swipe back/forward navigation and pinch to zoom
app.commandLine.appendSwitch('disable-pinch');
app.commandLine.appendSwitch('overscroll-history-navigation=0');

// ═══════════════════════════════════════════════════════════════
// VENTANA PRINCIPAL
// ═══════════════════════════════════════════════════════════════

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        kiosk: true,
        alwaysOnTop: true,
        fullscreen: true,
        skipTaskbar: true,
        type: 'screen-saver',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Force highest level of always-on-top
    mainWindow.setAlwaysOnTop(true, 'screen-saver');

    // Disable default menu
    mainWindow.setMenu(null);

    // Block Developer Tools and unsafe shortcuts
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            event.preventDefault();
        }
        if (input.key === 'F12') {
            event.preventDefault();
        }
        if ((input.control || input.meta) && input.key.toLowerCase() === 'w') {
            event.preventDefault();
        }
        if ((input.control || input.meta) && ['c', 'v', 'x'].includes(input.key.toLowerCase())) {
            event.preventDefault();
            clipboard.clear();
        }
    });

    // Track navigation history
    mainWindow.webContents.on('did-navigate', (event, url) => {
        guardarEnBDD('NAVEGACION', `El usuario navegó a: ${url}`);
    });

    mainWindow.webContents.on('did-navigate-in-page', (event, url) => {
        guardarEnBDD('NAVEGACION_INTERNA', `El usuario navegó internamente a: ${url}`);
    });

    // Load the initial file
    mainWindow.loadFile('index.html');

    // Prevent closing the window easily
    mainWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.webContents.send('show-exit-dialog');
        }
    });

    // Aggressively prevent losing focus
    mainWindow.on('blur', () => {
        clipboard.clear();
        guardarEnBDD('FOCO_PERDIDO', 'El alumno salió de la pantalla del examen.');

        mainWindow.webContents.send('show-alert', '¡Has salido del examen! Tienes 5 segundos para volver a esta pantalla o el examen se cancelará automáticamente.');

        blurTimeout = setTimeout(() => {
            guardarEnBDD('FRAUDE_DETECTADO', 'El alumno estuvo fuera de la pantalla por más de 5 segundos. Examen cancelado.');
            mainWindow.webContents.send('fraud-confirmed');
        }, 5000);
    });

    // Cancel the timeout if they return in time
    mainWindow.on('focus', () => {
        if (blurTimeout) {
            clearTimeout(blurTimeout);
            blurTimeout = null;
            guardarEnBDD('FOCO_RECUPERADO', 'El alumno regresó al examen a tiempo.');
            mainWindow.webContents.send('show-alert', null);
        }
    });

    // Prevent leaving full screen mode
    mainWindow.on('leave-full-screen', () => {
        mainWindow.setFullScreen(true);
    });
}

// ═══════════════════════════════════════════════════════════════
// CICLO DE VIDA DE LA APP
// ═══════════════════════════════════════════════════════════════

app.whenReady().then(() => {
    createWindow();

    // Block common OS shortcuts
    globalShortcut.register('CommandOrControl+Tab', () => {});
    globalShortcut.register('Alt+Tab', () => {});
    globalShortcut.register('CommandOrControl+W', () => {});
    globalShortcut.register('CommandOrControl+R', () => {});
    globalShortcut.register('F5', () => {});

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
