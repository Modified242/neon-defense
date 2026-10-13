import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Disable hardware acceleration to resolve GPU / NVIDIA driver crashes (e.g., 0xa896000 / DXGI hangs)
app.disableHardwareAcceleration();

function createWindow() {
  const win = new BrowserWindow({
    width: 1150,
    height: 750,
    title: 'Neon Defense',
    useContentSize: true, // so window content is exactly the size
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('child-process-gone', (event, details) => {
  if (details.type === 'GPU') {
    console.warn(`GPU process exited (${details.reason}): continuing on software renderer.`);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
