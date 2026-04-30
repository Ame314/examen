const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

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

  // Aggressively prevent losing focus (e.g., from touchpad gestures changing workspaces)
  mainWindow.on('blur', () => {
    mainWindow.focus();
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
