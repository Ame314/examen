const { app, BrowserWindow, globalShortcut, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

let blurTimeout = null;

const dbPath = path.join(app.getPath('userData'), 'database.json');

function readDB() {
    try {
        if (fs.existsSync(dbPath)) {
            return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        }
    } catch(e) { console.error('Error leyendo BDD', e); }
    
    // Base de datos por defecto
    return {
        questions: [
            { id: 1, text: '¿En qué año llegó Cristóbal Colón a América?', options: { a: '1492', b: '1500', c: '1400' }, correct: 'a', points: 5 },
            { id: 2, text: '¿Cuál es el río más largo del mundo?', options: { a: 'Nilo', b: 'Amazonas', c: 'Yangtsé' }, correct: 'b', points: 5 }
        ],
        students: [], 
        logs: []
    };
}

function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Handlers para la BDD Local
ipcMain.handle('db-get', () => readDB());

ipcMain.handle('add-question', (event, question) => {
    const db = readDB();
    if (!db.questions) db.questions = [];
    question.id = Date.now(); // Usar timestamp para ID único
    db.questions.push(question);
    writeDB(db);
    return true;
});

ipcMain.handle('save-student', (event, student) => {
    const db = readDB();
    if (!db.students) db.students = [];
    db.students.push(student);
    writeDB(db);
    return true;
});

async function guardarEnBDD(tipoEvento, detalle) {
  const timestamp = new Date().toISOString();
  const db = readDB();
  if (!db.logs) db.logs = [];
  db.logs.push({ timestamp, tipoEvento, detalle });
  writeDB(db);
  console.log(`[BDD Local] Guardado en Base de Datos -> ${tipoEvento}: ${detalle}`);
}
// Disable swipe back/forward navigation and pinch to zoom
app.commandLine.appendSwitch('disable-pinch');
app.commandLine.appendSwitch('overscroll-history-navigation=0');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    kiosk: true, // Full screen and non-exitable by normal means
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    type: 'screen-saver', // Helps on some Linux environments to stay on top
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

  // Block Developer Tools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
    }
    if (input.key === 'F12') {
      event.preventDefault();
    }
    // Try to block Ctrl+W / Cmd+W
    if ((input.control || input.meta) && input.key.toLowerCase() === 'w') {
        event.preventDefault();
    }
    // Block Copy and Paste (Ctrl+C, Ctrl+V, Cmd+C, Cmd+V, Ctrl+X)
    if ((input.control || input.meta) && (input.key.toLowerCase() === 'c' || input.key.toLowerCase() === 'v' || input.key.toLowerCase() === 'x')) {
        event.preventDefault();
        clipboard.clear(); // Clear clipboard to prevent any OS-level paste leak
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
      // Send a message to the renderer to show the exit dialog
      mainWindow.webContents.send('show-exit-dialog');
    }
  });

  // Aggressively prevent losing focus
  mainWindow.on('blur', () => {
    clipboard.clear(); // Clear clipboard when losing focus just in case
    guardarEnBDD('FOCO_PERDIDO', 'El alumno salió de la pantalla del examen.');
    
    // Show visual warning in the UI
    mainWindow.webContents.send('show-alert', '¡Has salido del examen! Tienes 5 segundos para volver a esta pantalla o el examen se cancelará automáticamente.');

    // Start 5-second countdown to cancel exam
    blurTimeout = setTimeout(() => {
      guardarEnBDD('FRAUDE_DETECTADO', 'El alumno estuvo fuera de la pantalla por más de 5 segundos. Examen cancelado.');
      mainWindow.webContents.send('show-alert', 'FRAUDE DETECTADO. Examen Cancelado.');
      
      // Delay quit slightly to let them see the message
      setTimeout(() => {
        app.isQuitting = true;
        app.quit();
      }, 2000);
    }, 5000);
  });

  // Cancel the timeout if they return in time
  mainWindow.on('focus', () => {
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      blurTimeout = null;
      guardarEnBDD('FOCO_RECUPERADO', 'El alumno regresó al examen a tiempo.');
      
      // Hide the visual warning
      mainWindow.webContents.send('show-alert', null);
    }
  });

  // Prevent leaving full screen mode
  mainWindow.on('leave-full-screen', () => {
    mainWindow.setFullScreen(true);
  });
}

app.whenReady().then(() => {
  createWindow();

  // Block common OS shortcuts if possible (Global shortcuts)
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

// IPC Handler to verify password and exit
ipcMain.handle('verify-exit', (event, password) => {
  if (password === '1234') { // Default password
    app.isQuitting = true;
    app.quit();
    return true;
  }
  return false;
});
