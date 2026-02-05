const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

const devServerUrl =
  process.env.ELECTRON_START_URL ||
  process.env.VITE_DEV_SERVER_URL ||
  'http://localhost:8080';

const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_START_URL;

// Collect startup errors for diagnostics
const startupErrors = [];

// Auto-updater state
let updateState = {
  checking: false,
  available: false,
  downloaded: false,
  downloading: false,
  progress: 0,
  error: null,
  version: null,
};

let mainWindow = null;

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  updateState = { ...updateState, checking: true, error: null };
  sendUpdateStatus();
});

autoUpdater.on('update-available', (info) => {
  updateState = {
    ...updateState,
    checking: false,
    available: true,
    version: info.version,
  };
  sendUpdateStatus();
});

autoUpdater.on('update-not-available', () => {
  updateState = { ...updateState, checking: false, available: false };
  sendUpdateStatus();
});

autoUpdater.on('download-progress', (progress) => {
  updateState = {
    ...updateState,
    downloading: true,
    progress: Math.round(progress.percent),
  };
  sendUpdateStatus();
});

autoUpdater.on('update-downloaded', (info) => {
  updateState = {
    ...updateState,
    downloading: false,
    downloaded: true,
    version: info.version,
  };
  sendUpdateStatus();
});

autoUpdater.on('error', (err) => {
  updateState = {
    ...updateState,
    checking: false,
    downloading: false,
    error: err.message,
  };
  sendUpdateStatus();
});

function sendUpdateStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', updateState);
  }
}

// IPC handlers for updates
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { ...updateState, error: 'Updates disabled in development mode' };
  }
  try {
    await autoUpdater.checkForUpdates();
    return updateState;
  } catch (err) {
    updateState.error = err.message;
    return updateState;
  }
});

ipcMain.handle('download-update', async () => {
  if (!updateState.available) {
    return { success: false, error: 'No update available' };
  }
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('install-update', () => {
  if (updateState.downloaded) {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  }
  return { success: false, error: 'Update not downloaded' };
});

ipcMain.handle('get-update-status', () => {
  return updateState;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// IPC handler for diagnostics
ipcMain.handle('get-diagnostics', () => {
  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  return {
    isElectron: true,
    platform: process.platform,
    userAgent: '',
    currentUrl: '',
    baseUrl: '/',
    nodeEnv: isDev ? 'development' : 'production',
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    appPath: app.getAppPath(),
    distPath: distPath,
    distExists: fs.existsSync(distPath),
    errors: startupErrors,
  };
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, '../public/pwa-512x512.png'),
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    console.log('[main] ready-to-show');
    mainWindow.show();
  });

  // Safety net: if the renderer never reaches ready-to-show (blank/hang), still show the window.
  setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('[main] ready-to-show timeout: forcing window show');
      mainWindow.show();
    }
  }, 2500);

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[main] did-finish-load', mainWindow.webContents.getURL());
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] render-process-gone', details);
    dialog.showErrorBox(
      'Errore di avvio',
      `Il processo grafico si è interrotto: ${details.reason}\n(exitCode: ${details.exitCode ?? 'n/a'})`
    );
    mainWindow.show();
  });

  // If the app fails to load (e.g. missing dist/index.html), show an error instead of staying hidden.
  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error('did-fail-load', { errorCode, errorDescription, validatedURL });
      dialog.showErrorBox(
        'Errore di avvio',
        `${errorDescription} (${errorCode})\n${validatedURL}`
      );
      mainWindow.show();
    }
  );

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('Loading:', indexPath);

    if (!fs.existsSync(indexPath)) {
      dialog.showErrorBox(
        'Errore di avvio',
        `Impossibile trovare la UI compilata:\n${indexPath}\n\nEsegui prima \"npm run build\" e poi crea il pacchetto.`
      );
      mainWindow.show();
      return;
    }

    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load index.html:', err);
      dialog.showErrorBox(
        'Errore di avvio',
        `Errore nel caricare:\n${indexPath}\n\n${String(err)}`
      );
      mainWindow.show();
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  // Check for updates on startup (in production)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.log('Auto-update check failed:', err.message);
      });
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
