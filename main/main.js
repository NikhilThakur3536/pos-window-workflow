// const { app, BrowserWindow, ipcMain, powerMonitor, Tray, Menu,shell,dialog } = require('electron');
// const path = require('path');
// const { spawn } = require('child_process');
// const dns = require('dns');
// const http = require('http');
// const handler = require('serve-handler');
// const { machineIdSync } = require('node-machine-id');
// const fs = require('fs').promises
// const fsSync = require('fs');
// const os= require("os")
// const { exec } = require("child_process");
// const { autoUpdater } = require('electron-updater')
// const log = require('electron-log');


// const fingerprint = require('../fingerprint-addon');
// const API_BASE_URL = process.env.API_BASE_URL || 'https://desktopretail.infoware.xyz';

// const FINGERPRINT_LOG_PATH = path.join(app.getPath('userData'), 'logs', 'fingerprint.log');
// function fingerprintLog(level, ...args) {
//     const timestamp = new Date().toISOString();
//     const message = `[${timestamp}] [${level}] ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
//     try {
//         const dir = path.dirname(FINGERPRINT_LOG_PATH);
//         if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
//         fsSync.appendFileSync(FINGERPRINT_LOG_PATH, message + '\n');
//     } catch (_) { /* ignore log write failures */ }
//     if (level === 'ERROR') console.error(message); else console.log(message);
// }

// app.commandLine.appendSwitch('disable-background-timer-throttling');
// app.commandLine.appendSwitch('disable-renderer-backgrounding');
// app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// const APP_NAME = 'Infooware POS';

// const BASE_IMPORTS_PATH = 'C:\\ProgramData\\DesktopRetail\\imports';

// // Offline & Online
// let isOffline = false;

// // Electron Related
// let mainWindow;
// let tray;
// app.isQuiting = false;

// const CACHE_CLEAR_INTERVAL = 30 * 60 * 1000;

// // Local server variables
// let server;
// const PORT = 3001;

// // Offline & Online - Logic

// ipcMain.on('app-offline', () => {
//     isOffline = true;
// });

// ipcMain.on('app-online', async () => {
//     isOffline = false;
// });

// ipcMain.on('exit-app', () => {
//     app.quit();
// });

// ipcMain.handle('select-file', async () => {
//   const result = await dialog.showOpenDialog({
//     properties: ['openFile'],
//     filters: [
//       { name: 'CSV Files', extensions: ['csv'] }
//     ]
//   });

//   if (result.canceled) return null;

//   return result.filePaths[0];
// });



// ipcMain.on('reload-app', async () => {
//     const isDev = await import('electron-is-dev').then((module) => module.default);
//     if (mainWindow && mainWindow.webContents) {
//         mainWindow.loadURL(isDev ? 'http://localhost:3000' : `http://localhost:${PORT}`);
//     }
// });

// ipcMain.handle('get-printers', async () => {
//     const win = BrowserWindow.getFocusedWindow();
//     if (!win) return [];
    
//     try {
//         const printers = await win.webContents.getPrintersAsync();
//         return printers;
//     } catch (error) {
//         console.error('Error getting printers:', error);
//         return [];
//     }
// });

// Object.assign(console, log.functions); 
// autoUpdater.logger = log;
// autoUpdater.logger.transports.file.level = 'info';

// autoUpdater.on("update-available", (info) => {
//     console.log("Update available:", info.version);

//     mainWindow?.webContents.send("update-available", {
//         version: info.version
//     });
// });

// autoUpdater.on("checking-for-update", () => {
//     console.log("Checking for update...");
// });

// autoUpdater.on("update-not-available", (info) => {
//     console.log("No update available. Current version:", info.version);
// });

// autoUpdater.on("update-downloaded", (info) => {
//     console.log("Update downloaded:", info.version);

//     mainWindow?.webContents.send("update-downloaded", {
//         version: info.version
//     });
// });

// autoUpdater.on("error", (error) => {
//     console.error("Auto-update error:", error);
// });

// ipcMain.handle('print-pdf-from-url', async (_, payload) => {
//     console.log('IPC print-pdf-from-url RECEIVED');

//     const {
//         url,
//         deviceName,
//         copies = 1,
//         silent = true,
//     } = payload || {};

//     if (!url) {
//         console.error('No PDF URL received');
//         return false;
//     }

//     const tempPath = path.join(
//         os.tmpdir(),
//         `label-${Date.now()}.pdf`
//     );

//     let printWin = null;

//     try {
//         const response = await fetch(url);

//         if (!response.ok) {
//             throw new Error(`Failed to download PDF: ${response.status}`);
//         }

//         const arrayBuffer = await response.arrayBuffer();

//         await fs.writeFile(
//             tempPath,
//             Buffer.from(arrayBuffer)
//         );

//         // Create hidden browser window
//         printWin = new BrowserWindow({
//             show: false,
//             webPreferences: {
//                 plugins: true,
//             },
//         });

//         await printWin.loadURL(`file://${tempPath}`);

//         await new Promise((resolve) => setTimeout(resolve, 1200));

//         console.log(`Printing on ${deviceName || 'Default Printer'}...`);

//         const success = await new Promise((resolve) => {
//             printWin.webContents.print(
//                 {
//                     silent,
//                     deviceName: deviceName || undefined,
//                     printBackground: true,
//                     copies,
//                     marginsType: 0,
//                 },
//                 (success, failureReason) => {
//                     if (success) {
//                         console.log('Print job sent successfully!');
//                     } else {
//                         console.error('Print failed:', failureReason);
//                     }

//                     resolve(success);
//                 }
//             );
//         });

//         return success;
//     } catch (error) {
//         console.error('Error printing PDF from URL:', error);
//         return false;
//     } finally {
//         if (printWin) {
//             printWin.close();
//         }

//         if (fsSync.existsSync(tempPath)) {
//             fsSync.unlinkSync(tempPath);
//         }
//     }
// });

// async function callFingerprintApi(pathSuffix, { method = 'GET', body, authToken, extraHeaders } = {}) {
//     const url = `${API_BASE_URL}${pathSuffix}`;
//     const headers = { 'Content-Type': 'application/json', ...extraHeaders };
//     if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

//     console.log(`[Fingerprint API] -> ${method} ${url}`, body ? { body } : '', authToken ? '(authenticated)' : '(no auth)');

//     const response = await fetch(url, {
//         method,
//         headers,
//         body: body ? JSON.stringify(body) : undefined,
//     });

//     let data = null;
//     try {
//         data = await response.json();
//     } catch (err) {
//         console.warn(`[Fingerprint API] <- ${method} ${url} returned non-JSON body`);
//     }

//     console.log(`[Fingerprint API] <- ${method} ${url} status=${response.status}`, data);

//     if (!response.ok) {
//         const message = (data && (data.message || data.error)) || `Request failed with status ${response.status}`;
//         const error = new Error(message);
//         error.status = response.status;
//         error.body = data;
//         throw error;
//     }

//     return data;
// }


// ipcMain.handle('fingerprint-enroll', async (_event, { userId, userName, deviceId, deviceName, authToken } = {}) => {
//     fingerprintLog('INFO', '[Fingerprint] fingerprint-enroll IPC received.', { userId, userName, deviceId, deviceName, hasAuthToken: !!authToken });

//     if (!userId || !deviceId || !authToken) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-enroll FAILED: missing userId, deviceId, or authToken');
//         return { success: false, error: 'userId, deviceId, and authToken are required' };
//     }

//     try {
//         fingerprintLog('INFO', '[Fingerprint] Capturing sample... waiting for finger on reader');
//         const capture = await fingerprint.captureFingerprintSample();

//         if (!capture.success) {
//             fingerprintLog('ERROR', '[Fingerprint] Capture failed:', capture.error);
//             return { success: false, error: capture.error, rejectDetail: capture.rejectDetail };
//         }

//         fingerprintLog('INFO', '[Fingerprint] Capture succeeded. Sending enroll request to backend...');

//         const data = await callFingerprintApi('/api/company/users/fingerprint/enroll', {
//             method: 'POST',
//             authToken,
//             body: {
//                 userId,
//                 userName,
//                 deviceId,
//                 deviceName,
//                 templateReference: capture.templateReference,
//             },
//         });

//         fingerprintLog('INFO', '[Fingerprint] Backend enroll SUCCESS for userId:', userId);
//         return { success: true, data };
//     } catch (err) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-enroll EXCEPTION:', err.message, err.body || '');
//         return { success: false, error: err.message, status: err.status, body: err.body };
//     }
// });

// ipcMain.handle('fingerprint-login', async (_event, { domainId, deviceId, terminalId } = {}) => {
//     fingerprintLog('INFO', '[Fingerprint] fingerprint-login IPC received.', { domainId, deviceId, terminalId });

//     if (!domainId || !deviceId) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-login FAILED: missing domainId or deviceId');
//         return { success: false, error: 'domainId and deviceId are required' };
//     }

//     try {
//         fingerprintLog('INFO', '[Fingerprint] Capturing sample... waiting for finger on reader');
//         const capture = await fingerprint.captureFingerprintSample();

//         if (!capture.success) {
//             fingerprintLog('ERROR', '[Fingerprint] Capture failed:', capture.error);
//             return { success: false, error: capture.error, rejectDetail: capture.rejectDetail };
//         }

//         fingerprintLog('INFO', '[Fingerprint] Capture succeeded. Sending login request to backend...');

//         const extraHeaders = {};
//         if (terminalId) {
//             extraHeaders['Terminal-Id'] = terminalId;
//             fingerprintLog('INFO', '[Fingerprint] Attaching Terminal-Id header:', terminalId);
//         }

//         // No authToken passed - this endpoint takes no Bearer token.
//         const data = await callFingerprintApi('/api/company/users/fingerprint/login', {
//             method: 'POST',
//             extraHeaders,
//             body: {
//                 domainId,
//                 deviceId,
//                 templateReference: capture.templateReference,
//             },
//         });

//         fingerprintLog('INFO', '[Fingerprint] Backend login SUCCESS. Received JWT/user response.');
//         return { success: true, data }; // data is the same JWT/user shape as normal login
//     } catch (err) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-login EXCEPTION:', err.message, err.body || '');
//         return { success: false, error: err.message, status: err.status, body: err.body };
//     }
// });

// ipcMain.handle('fingerprint-list', async (_event, { userId, authToken } = {}) => {
//     fingerprintLog('INFO', '[Fingerprint] fingerprint-list IPC received.', { userId, hasAuthToken: !!authToken });

//     if (!userId || !authToken) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-list FAILED: missing userId or authToken');
//         return { success: false, error: 'userId and authToken are required' };
//     }

//     try {
//         const data = await callFingerprintApi(`/api/company/users/fingerprint/${encodeURIComponent(userId)}`, {
//             method: 'GET',
//             authToken,
//         });

//         fingerprintLog('INFO', '[Fingerprint] fingerprint-list SUCCESS. Count:', Array.isArray(data) ? data.length : 'n/a');
//         return { success: true, data };
//     } catch (err) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-list EXCEPTION:', err.message, err.body || '');
//         return { success: false, error: err.message, status: err.status, body: err.body };
//     }
// });

// ipcMain.handle('fingerprint-remove', async (_event, { id, authToken } = {}) => {
//     fingerprintLog('INFO', '[Fingerprint] fingerprint-remove IPC received.', { id, hasAuthToken: !!authToken });

//     if (!id || !authToken) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-remove FAILED: missing id or authToken');
//         return { success: false, error: 'id and authToken are required' };
//     }

//     try {
//         const data = await callFingerprintApi(`/api/company/users/fingerprint/${encodeURIComponent(id)}`, {
//             method: 'DELETE',
//             authToken,
//         });

//         fingerprintLog('INFO', '[Fingerprint] fingerprint-remove SUCCESS for id:', id);
//         return { success: true, data };
//     } catch (err) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-remove EXCEPTION:', err.message, err.body || '');
//         return { success: false, error: err.message, status: err.status, body: err.body };
//     }
// });

// const ZPL_PRINTER_SHARE = '\\\\localhost\\ZDesigner ZD421-203dpi ZPL';

// async function sendZplWindows(zpl, printerShareName) {
//     const tempPath = path.join(os.tmpdir(), `label-${Date.now()}.zpl`);
//     await fs.writeFile(tempPath, zpl, 'utf8');

//     return new Promise((resolve) => {
//         exec(`copy /b "${tempPath}" "${printerShareName}"`, (err) => {
//             fs.unlink(tempPath).catch(() => {});
//             if (err) {
//                 console.error('ZPL print error:', err);
//                 resolve(false);
//             } else {
//                 console.log('ZPL sent via copy /b');
//                 resolve(true);
//             }
//         });
//     });
// }

// ipcMain.handle("print-label", async (_, payload) => {
//     const {
//         type,
//         url,
//         buffer,
//         zpl,
//         deviceName,
//         copies = 1,
//         silent = true,
//     } = payload || {};

//     let tempPath = null;
//     let printWin = null;

//     console.log("🖨️ [print-label] Received payload:", { 
//         type, 
//         hasZpl: !!zpl, 
//         hasUrl: !!url, 
//         hasBuffer: !!buffer,
//         deviceName: deviceName || "Default Printer",
//         copies,
//         silent 
//     });

//     try {
//         if (type === "zpl") {
//             console.log(" [ZPL] Starting ZPL print...");
//             if (!zpl) {
//                 throw new Error("Missing ZPL data");
//             }

//             console.log(" [ZPL] ZPL data length:", zpl.length);
//             console.log(" [ZPL] Sending to printer share:", ZPL_PRINTER_SHARE);

//             let allSucceeded = true;
//             for (let i = 0; i < copies; i++) {
//                 const ok = await sendZplWindows(zpl, ZPL_PRINTER_SHARE);
//                 if (ok) {
//                     console.log(` [ZPL] Copy ${i + 1}/${copies} sent successfully`);
//                 } else {
//                     console.error(`[ZPL] Copy ${i + 1}/${copies} failed`);
//                     allSucceeded = false;
//                 }
//             }

//             return allSucceeded;
//         }
//         if (type === "pdf-buffer" || type === "pdf-url") {
//             if (type === "pdf-buffer") {
//                 console.log("📄 [PDF-BUFFER] Processing PDF buffer...");
//                 if (!buffer) throw new Error("Missing PDF buffer");

//                 tempPath = path.join(os.tmpdir(), `label-${Date.now()}.pdf`);
//                 await fs.writeFile(tempPath, Buffer.from(buffer));
//             } 
//             else if (type === "pdf-url") {
//                 console.log("📄 [PDF-URL] Downloading PDF from:", url);
//                 if (!url) throw new Error("Missing PDF URL");

//                 tempPath = path.join(os.tmpdir(), `label-${Date.now()}.pdf`);

//                 const response = await fetch(url);
//                 if (!response.ok) throw new Error(`Failed to download PDF (${response.status})`);

//                 const arrayBuffer = await response.arrayBuffer();
//                 await fs.writeFile(tempPath, Buffer.from(arrayBuffer));
//             }

//             console.log("📄 PDF saved to temp:", tempPath);

//             printWin = new BrowserWindow({ show: false, webPreferences: { plugins: true } });
//             await printWin.loadURL(`file://${tempPath}`);
//             await new Promise(resolve => setTimeout(resolve, 1500));

//             const success = await new Promise((resolve) => {
//                 printWin.webContents.print({
//                     silent,
//                     deviceName: deviceName || undefined,
//                     copies,
//                     printBackground: true,
//                     marginsType: 0,
//                 }, (success, failureReason) => {
//                     if (success) console.log("✅ [PDF] Print job sent successfully");
//                     else console.error("❌ [PDF] Print failed:", failureReason);
//                     resolve(success);
//                 });
//             });

//             return success;
//         }

//         throw new Error("Invalid print type");

//     } catch (err) {
//         console.error("❌ [print-label] Print Error:", err);
//         return false;
//     } finally {
//         if (printWin && !printWin.isDestroyed()) {
//             printWin.close();
//         }

//         if (tempPath && fsSync.existsSync(tempPath)) {
//             try {
//                 fsSync.unlinkSync(tempPath);
//                 console.log("🧹 Temp file deleted");
//             } catch (e) {
//                 console.error("⚠️ Failed to delete temp file");
//             }
//         }
//     }
// });


// function checkInternetConnection() {
//     return new Promise((resolve) => {
//         dns.lookup('google.com', (err) => {
//             if (err) {
//                 isOffline = true;
//                 resolve(false);
//             } else {
//                 isOffline = false;
//                 resolve(true);
//             }
//         });
//     });
// }

// async function createWindow() {
//     const isDev = await import('electron-is-dev').then((module) => module.default);

//     // mainWindow = new BrowserWindow({
//     //     width: 800,
//     //     height: 600,
//     //     show: false,
//     //     simpleFullscreen: true,
//     //     title: APP_NAME,
//     //     icon: path.join(__dirname, '..', 'icons', 'icon.ico'),
//     //     webPreferences: {
//     //         nodeIntegration: false,
//     //         contextIsolation: true,
//     //         preload: path.join(__dirname, 'preload.js'),
//     //         webSecurity: true,
//     //     },
//     //     skipTaskbar: false,
//     //     minimizable: true,
//     //     closable: true,
//     // });
//     mainWindow = new BrowserWindow({
//         show: false,

//         width: 1920,
//         height: 1080,

//         minWidth: 1200,
//         minHeight: 700,

//         autoHideMenuBar: false,
//         backgroundColor: '#ffffff',
//         resizable:true,
//         minimizable:true,
//         maximizable:true,

//         title: APP_NAME,
//         icon: path.join(__dirname, '..', 'icons', 'icon.ico'),

//         webPreferences: {
//             nodeIntegration: false,
//             contextIsolation: true,
//             preload: path.join(__dirname, 'preload.js'),
//             webSecurity: true,
//         },
//         skipTaskbar:false,
//         minimizable:true,
//         closable:true,
//     });

//     mainWindow.maximize();


//     if (isDev) {
//         mainWindow.loadURL('http://localhost:3000');
//     } else {
//         const publicDirectory = path.join(__dirname, '../out');
//         server = http.createServer((request, response) => {
//             return handler(request, response, {
//                 public: publicDirectory,
//                 rewrites: [{ source: '**', destination: '/index.html' }],
//             });
//         });

//         server.listen(PORT, () => {
//             mainWindow.loadURL(`http://localhost:${PORT}`);
//         });
//     }

//     setInterval(() => {
//         if (mainWindow && !mainWindow.isDestroyed()) {
//             mainWindow.webContents.session.clearCache().then(() => {
//                 console.log('Cache cleared at:: ', new Date().toLocaleTimeString());
//             });
//         }
//     }, CACHE_CLEAR_INTERVAL);

//     // mainWindow.once('ready-to-show', async () => {
//     //     mainWindow.maximize();

//     //     mainWindow.show();
//     //     mainWindow.focus();
//     //     mainWindow.setAlwaysOnTop(true);
//     //     mainWindow.setAlwaysOnTop(false);

//     //     await checkInternetConnection();
//     // });

//     mainWindow.once('ready-to-show', async () => {
//         mainWindow.show();
//         mainWindow.focus();

//         mainWindow.setAlwaysOnTop(true);
//         mainWindow.setAlwaysOnTop(false);

//         await checkInternetConnection();
//     });

//     mainWindow.on('closed', () => {
//         mainWindow = null;
//     });

//     mainWindow.on('close', () => {
//         app.isQuiting = true;
//         app.quit();
//     });

//     // mainWindow.on('close', (event) => {
//     //     if (!app.isQuiting) {
//     //         event.preventDefault();
//     //         mainWindow.hide();

//     //         if (tray) {
//     //             tray.displayBalloon({
//     //                 iconType: 'info',
//     //                 title: APP_NAME,
//     //                 content: 'App is still running in the background. Right-click the tray icon to access options.',
//     //             });
//     //         }

//     //         return false;
//     //     }
//     // });

//     mainWindow.webContents.on('crashed', () => {
//         console.error('Window crashed, attempting to reload...');
//         if (!mainWindow.isDestroyed()) {
//             mainWindow.reload();
//         }
//     });

//     mainWindow.webContents.on('unresponsive', () => {
//         console.warn('Window became unresponsive');
//     });

//     mainWindow.webContents.on('responsive', () => {
//         console.log('Window became responsive again');
//     });

//     if (isDev) {
//         mainWindow.webContents.openDevTools();
//     }
// }

// function createTray() {
//     const iconPath = path.join(__dirname, '..', 'icons', 'icon.png');
//     tray = new Tray(iconPath);

//     const contextMenu = Menu.buildFromTemplate([
//         {
//             label: 'Show App',
//             click: () => {
//                 mainWindow.show();
//                 mainWindow.focus();
//             },
//         },
//         {
//             label: 'Quit App',
//             click: () => {
//                 app.isQuiting = true;
//                 app.quit();
//             },
//         },
//     ]);

//     tray.setToolTip(APP_NAME);
//     tray.setContextMenu(contextMenu);

//     tray.on('click', () => {
//         mainWindow.show();
//         mainWindow.focus();
//     });
// }

// const gotTheLock = app.requestSingleInstanceLock();

// if (!gotTheLock) {
//     app.quit();
// } else {
//     app.on('second-instance', () => {
//         if (mainWindow) {
//             if (mainWindow.isMinimized()) {
//                 mainWindow.restore();
//             }

//             if (!mainWindow.isVisible()) {
//                 mainWindow.show();
//             }

//             mainWindow.focus();

//             if (process.platform === 'win32') {
//                 mainWindow.setAlwaysOnTop(true);
//                 mainWindow.setAlwaysOnTop(false);
//                 mainWindow.showInactive();
//                 mainWindow.show();
//             }
//         } else {
//             createWindow();
//         }
//     });

//     app.on('ready', async () => {
//         // await createDefaultFolders();
//         await createWindow();
//         // createTray();

//          if (app.isPackaged) {
//             console.log('App ready')
//         autoUpdater.checkForUpdatesAndNotify();
//     }

//         powerMonitor.on('suspend', () => {
//             mainWindow.webContents.send('windows-sleep-mode', true);
//         });

//         powerMonitor.on('resume', async () => {
//             const isDev = await import('electron-is-dev').then((mod) => mod.default);

//             const execPath = isDev ? process.argv[0] : process.execPath;
//             const args = isDev ? [path.join(__dirname, '..')] : [];

//             setTimeout(() => {
//                 try {
//                     spawn(execPath, args, {
//                         detached: true,
//                         stdio: 'ignore',
//                     }).unref();

//                     setTimeout(() => {
//                         mainWindow.webContents.send('windows-sleep-mode', false);
//                     }, 5000);
//                 } catch (err) {
//                     console.error('Failed to relaunch app:', err);
//                 } finally {
//                     app.quit();
//                 }
//             }, 1000);
//         });
//     });

//     app.on('window-all-closed', () => {
//         if (process.platform !== 'darwin') {
//             app.quit();
//         }
//     });

//     app.on('will-quit', () => {
//         if (server) {
//             server.close(() => {});
//         }
//     });

//     app.on('activate', () => {
//         if (mainWindow === null) {
//             createWindow();
//         }
//     });
// }

// async function clearRendererStorage() {
//     if (mainWindow && !mainWindow.isDestroyed()) {
//         try {
//             await mainWindow.webContents.session.clearStorageData({
//                 storages: ['localStorage'],
//             });
//         } catch (error) {
//             console.error('Error clearing storage:', error);
//         }
//     }
// }

// app.on('will-uninstall', async (event) => {
//     event.preventDefault();
//     try {
//         await clearRendererStorage();
//     } catch (error) {
//         console.error('Error clearing renderer storage:', error);
//     }
//     event.continue();
// });

// ipcMain.handle('get-device-id', async () => {
//     return machineIdSync(true);
// });
// const { app, BrowserWindow, ipcMain, powerMonitor, Tray, Menu,shell,dialog } = require('electron');
// const path = require('path');
// const { spawn } = require('child_process');
// const dns = require('dns');
// const http = require('http');
// const handler = require('serve-handler');
// const { machineIdSync } = require('node-machine-id');
// const fs = require('fs').promises
// const fsSync = require('fs');
// const os= require("os")
// const { exec } = require("child_process");
// const { autoUpdater } = require('electron-updater')
// const log = require('electron-log');


// const fingerprint = require('../fingerprint-addon');
// const API_BASE_URL = process.env.API_BASE_URL || 'https://desktopretail.infoware.xyz';

// // Must stay in lockstep with UserService.MIN_ENROLL_SAMPLES /
// // MAX_ENROLL_SAMPLES on the backend (users.service.ts). The backend rejects
// // enrollment requests outside this range, so clamping here just avoids a
// // pointless round trip with a request we already know will fail.
// const MIN_ENROLL_SAMPLES = 3;
// const MAX_ENROLL_SAMPLES = 4;
// const DEFAULT_ENROLL_SAMPLES = 4;

// const FINGERPRINT_LOG_PATH = path.join(app.getPath('userData'), 'logs', 'fingerprint.log');
// function fingerprintLog(level, ...args) {
//     const timestamp = new Date().toISOString();
//     const message = `[${timestamp}] [${level}] ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
//     try {
//         const dir = path.dirname(FINGERPRINT_LOG_PATH);
//         if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
//         fsSync.appendFileSync(FINGERPRINT_LOG_PATH, message + '\n');
//     } catch (_) { /* ignore log write failures */ }
//     if (level === 'ERROR') console.error(message); else console.log(message);
// }

// // Promisified wrapper around the native captureMultiple(sampleCount,
// // onProgress, callback) export. onProgress is invoked synchronously (via the
// // addon's ThreadSafeFunction) for each scan with { index, total, stage },
// // where stage is 'waiting' | 'captured' | 'duplicate'. Kept local to main.js
// // rather than in fingerprint-addon.js so the multi-sample orchestration and
// // its logging/IPC forwarding live in one place.
// function captureFingerprintSamples(sampleCount, onProgress) {
//     return new Promise((resolve, reject) => {
//         try {
//             fingerprint.captureMultiple(
//                 sampleCount,
//                 (progress) => {
//                     try {
//                         onProgress && onProgress(progress);
//                     } catch (progressErr) {
//                         fingerprintLog('ERROR', '[Fingerprint] onProgress handler threw:', progressErr.message);
//                     }
//                 },
//                 (err, result) => {
//                     if (err) reject(err);
//                     else resolve(result);
//                 },
//             );
//         } catch (err) {
//             reject(err);
//         }
//     });
// }

// app.commandLine.appendSwitch('disable-background-timer-throttling');
// app.commandLine.appendSwitch('disable-renderer-backgrounding');
// app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// const APP_NAME = 'Infooware POS';

// const BASE_IMPORTS_PATH = 'C:\\ProgramData\\DesktopRetail\\imports';

// // Offline & Online
// let isOffline = false;

// // Electron Related
// let mainWindow;
// let tray;
// app.isQuiting = false;

// const CACHE_CLEAR_INTERVAL = 30 * 60 * 1000;

// // Local server variables
// let server;
// const PORT = 3001;

// // Offline & Online - Logic

// ipcMain.on('app-offline', () => {
//     isOffline = true;
// });

// ipcMain.on('app-online', async () => {
//     isOffline = false;
// });

// ipcMain.on('exit-app', () => {
//     app.quit();
// });

// ipcMain.handle('select-file', async () => {
//   const result = await dialog.showOpenDialog({
//     properties: ['openFile'],
//     filters: [
//       { name: 'CSV Files', extensions: ['csv'] }
//     ]
//   });

//   if (result.canceled) return null;

//   return result.filePaths[0];
// });



// ipcMain.on('reload-app', async () => {
//     const isDev = await import('electron-is-dev').then((module) => module.default);
//     if (mainWindow && mainWindow.webContents) {
//         mainWindow.loadURL(isDev ? 'http://localhost:3000' : `http://localhost:${PORT}`);
//     }
// });

// ipcMain.handle('get-printers', async () => {
//     const win = BrowserWindow.getFocusedWindow();
//     if (!win) return [];
    
//     try {
//         const printers = await win.webContents.getPrintersAsync();
//         return printers;
//     } catch (error) {
//         console.error('Error getting printers:', error);
//         return [];
//     }
// });

// Object.assign(console, log.functions); 
// autoUpdater.logger = log;
// autoUpdater.logger.transports.file.level = 'info';

// autoUpdater.on("update-available", (info) => {
//     console.log("Update available:", info.version);

//     mainWindow?.webContents.send("update-available", {
//         version: info.version
//     });
// });

// autoUpdater.on("checking-for-update", () => {
//     console.log("Checking for update...");
// });

// autoUpdater.on("update-not-available", (info) => {
//     console.log("No update available. Current version:", info.version);
// });

// autoUpdater.on("update-downloaded", (info) => {
//     console.log("Update downloaded:", info.version);

//     mainWindow?.webContents.send("update-downloaded", {
//         version: info.version
//     });
// });

// autoUpdater.on("error", (error) => {
//     console.error("Auto-update error:", error);
// });

// ipcMain.handle('print-pdf-from-url', async (_, payload) => {
//     console.log('IPC print-pdf-from-url RECEIVED');

//     const {
//         url,
//         deviceName,
//         copies = 1,
//         silent = true,
//     } = payload || {};

//     if (!url) {
//         console.error('No PDF URL received');
//         return false;
//     }

//     const tempPath = path.join(
//         os.tmpdir(),
//         `label-${Date.now()}.pdf`
//     );

//     let printWin = null;

//     try {
//         const response = await fetch(url);

//         if (!response.ok) {
//             throw new Error(`Failed to download PDF: ${response.status}`);
//         }

//         const arrayBuffer = await response.arrayBuffer();

//         await fs.writeFile(
//             tempPath,
//             Buffer.from(arrayBuffer)
//         );

//         // Create hidden browser window
//         printWin = new BrowserWindow({
//             show: false,
//             webPreferences: {
//                 plugins: true,
//             },
//         });

//         await printWin.loadURL(`file://${tempPath}`);

//         await new Promise((resolve) => setTimeout(resolve, 1200));

//         console.log(`Printing on ${deviceName || 'Default Printer'}...`);

//         const success = await new Promise((resolve) => {
//             printWin.webContents.print(
//                 {
//                     silent,
//                     deviceName: deviceName || undefined,
//                     printBackground: true,
//                     copies,
//                     marginsType: 0,
//                 },
//                 (success, failureReason) => {
//                     if (success) {
//                         console.log('Print job sent successfully!');
//                     } else {
//                         console.error('Print failed:', failureReason);
//                     }

//                     resolve(success);
//                 }
//             );
//         });

//         return success;
//     } catch (error) {
//         console.error('Error printing PDF from URL:', error);
//         return false;
//     } finally {
//         if (printWin) {
//             printWin.close();
//         }

//         if (fsSync.existsSync(tempPath)) {
//             fsSync.unlinkSync(tempPath);
//         }
//     }
// });

// async function callFingerprintApi(pathSuffix, { method = 'GET', body, authToken, extraHeaders } = {}) {
//     const url = `${API_BASE_URL}${pathSuffix}`;
//     const headers = { 'Content-Type': 'application/json', ...extraHeaders };
//     if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

//     console.log(`[Fingerprint API] -> ${method} ${url}`, body ? { body } : '', authToken ? '(authenticated)' : '(no auth)');

//     const response = await fetch(url, {
//         method,
//         headers,
//         body: body ? JSON.stringify(body) : undefined,
//     });

//     let data = null;
//     try {
//         data = await response.json();
//     } catch (err) {
//         console.warn(`[Fingerprint API] <- ${method} ${url} returned non-JSON body`);
//     }

//     console.log(`[Fingerprint API] <- ${method} ${url} status=${response.status}`, data);

//     if (!response.ok) {
//         const message = (data && (data.message || data.error)) || `Request failed with status ${response.status}`;
//         const error = new Error(message);
//         error.status = response.status;
//         error.body = data;
//         throw error;
//     }

//     return data;
// }


// ipcMain.handle('fingerprint-enroll', async (_event, { userId, userName, deviceId, deviceName, authToken, sampleCount } = {}) => {
//     fingerprintLog('INFO', '[Fingerprint] fingerprint-enroll IPC received.', { userId, userName, deviceId, deviceName, sampleCount, hasAuthToken: !!authToken });

//     if (!userId || !deviceId || !authToken) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-enroll FAILED: missing userId, deviceId, or authToken');
//         return { success: false, error: 'userId, deviceId, and authToken are required' };
//     }

//     // Clamp whatever the renderer asked for into the range the backend will
//     // actually accept, defaulting to the max so enrollment quality is best
//     // by default without the caller having to know the exact number.
//     const requestedSamples = Number(sampleCount) || DEFAULT_ENROLL_SAMPLES;
//     const targetSampleCount = Math.min(Math.max(requestedSamples, MIN_ENROLL_SAMPLES), MAX_ENROLL_SAMPLES);

//     try {
//         fingerprintLog('INFO', `[Fingerprint] Capturing ${targetSampleCount} samples... waiting for finger on reader`);

//         const capture = await captureFingerprintSamples(targetSampleCount, (progress) => {
//             fingerprintLog('INFO', '[Fingerprint] capture progress', progress);
//             if (mainWindow && !mainWindow.isDestroyed()) {
//                 mainWindow.webContents.send('fingerprint-enroll-progress', progress);
//             }
//         });

//         if (!capture.success) {
//             fingerprintLog('ERROR', '[Fingerprint] Multi-capture failed:', capture.error);
//             return { success: false, error: capture.error, rejectDetail: capture.rejectDetail };
//         }

//         fingerprintLog('INFO', `[Fingerprint] Captured ${capture.templateReferences.length} samples. Sending enroll request to backend...`);

//         const data = await callFingerprintApi('/api/company/users/fingerprint/enroll', {
//             method: 'POST',
//             authToken,
//             body: {
//                 userId,
//                 userName,
//                 deviceId,
//                 deviceName,
//                 templateReferences: capture.templateReferences,
//             },
//         });

//         fingerprintLog('INFO', '[Fingerprint] Backend enroll SUCCESS for userId:', userId);
//         return { success: true, data };
//     } catch (err) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-enroll EXCEPTION:', err.message, err.body || '');
//         return { success: false, error: err.message, status: err.status, body: err.body };
//     }
// });

// ipcMain.handle('fingerprint-login', async (_event, { domainId, deviceId, terminalId } = {}) => {
//     fingerprintLog('INFO', '[Fingerprint] fingerprint-login IPC received.', { domainId, deviceId, terminalId });

//     if (!domainId || !deviceId) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-login FAILED: missing domainId or deviceId');
//         return { success: false, error: 'domainId and deviceId are required' };
//     }

//     try {
//         fingerprintLog('INFO', '[Fingerprint] Capturing sample... waiting for finger on reader');
//         const capture = await fingerprint.captureFingerprintSample();

//         if (!capture.success) {
//             fingerprintLog('ERROR', '[Fingerprint] Capture failed:', capture.error);
//             return { success: false, error: capture.error, rejectDetail: capture.rejectDetail };
//         }

//         fingerprintLog('INFO', '[Fingerprint] Capture succeeded. Sending login request to backend...');

//         const extraHeaders = {};
//         if (terminalId) {
//             extraHeaders['Terminal-Id'] = terminalId;
//             fingerprintLog('INFO', '[Fingerprint] Attaching Terminal-Id header:', terminalId);
//         }

//         // No authToken passed - this endpoint takes no Bearer token.
//         // Login still only sends a single live scan - the backend now
//         // scores it against every sample enrolled for every credential on
//         // this device (see UserService.loginWithFingerprint), so there is
//         // no need to capture multiple scans here.
//         const data = await callFingerprintApi('/api/company/users/fingerprint/login', {
//             method: 'POST',
//             extraHeaders,
//             body: {
//                 domainId,
//                 deviceId,
//                 templateReference: capture.templateReference,
//             },
//         });

//         fingerprintLog('INFO', '[Fingerprint] Backend login SUCCESS. Received JWT/user response.');
//         return { success: true, data }; // data is the same JWT/user shape as normal login
//     } catch (err) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-login EXCEPTION:', err.message, err.body || '');
//         return { success: false, error: err.message, status: err.status, body: err.body };
//     }
// });

// ipcMain.handle('fingerprint-list', async (_event, { userId, authToken } = {}) => {
//     fingerprintLog('INFO', '[Fingerprint] fingerprint-list IPC received.', { userId, hasAuthToken: !!authToken });

//     if (!userId || !authToken) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-list FAILED: missing userId or authToken');
//         return { success: false, error: 'userId and authToken are required' };
//     }

//     try {
//         const data = await callFingerprintApi(`/api/company/users/fingerprint/${encodeURIComponent(userId)}`, {
//             method: 'GET',
//             authToken,
//         });

//         fingerprintLog('INFO', '[Fingerprint] fingerprint-list SUCCESS. Count:', Array.isArray(data) ? data.length : 'n/a');
//         return { success: true, data };
//     } catch (err) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-list EXCEPTION:', err.message, err.body || '');
//         return { success: false, error: err.message, status: err.status, body: err.body };
//     }
// });

// ipcMain.handle('fingerprint-remove', async (_event, { id, authToken } = {}) => {
//     fingerprintLog('INFO', '[Fingerprint] fingerprint-remove IPC received.', { id, hasAuthToken: !!authToken });

//     if (!id || !authToken) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-remove FAILED: missing id or authToken');
//         return { success: false, error: 'id and authToken are required' };
//     }

//     try {
//         const data = await callFingerprintApi(`/api/company/users/fingerprint/${encodeURIComponent(id)}`, {
//             method: 'DELETE',
//             authToken,
//         });

//         fingerprintLog('INFO', '[Fingerprint] fingerprint-remove SUCCESS for id:', id);
//         return { success: true, data };
//     } catch (err) {
//         fingerprintLog('ERROR', '[Fingerprint] fingerprint-remove EXCEPTION:', err.message, err.body || '');
//         return { success: false, error: err.message, status: err.status, body: err.body };
//     }
// });

// const ZPL_PRINTER_SHARE = '\\\\localhost\\ZDesigner ZD421-203dpi ZPL';

// async function sendZplWindows(zpl, printerShareName) {
//     const tempPath = path.join(os.tmpdir(), `label-${Date.now()}.zpl`);
//     await fs.writeFile(tempPath, zpl, 'utf8');

//     return new Promise((resolve) => {
//         exec(`copy /b "${tempPath}" "${printerShareName}"`, (err) => {
//             fs.unlink(tempPath).catch(() => {});
//             if (err) {
//                 console.error('ZPL print error:', err);
//                 resolve(false);
//             } else {
//                 console.log('ZPL sent via copy /b');
//                 resolve(true);
//             }
//         });
//     });
// }

// ipcMain.handle("print-label", async (_, payload) => {
//     const {
//         type,
//         url,
//         buffer,
//         zpl,
//         deviceName,
//         copies = 1,
//         silent = true,
//     } = payload || {};

//     let tempPath = null;
//     let printWin = null;

//     console.log("🖨️ [print-label] Received payload:", { 
//         type, 
//         hasZpl: !!zpl, 
//         hasUrl: !!url, 
//         hasBuffer: !!buffer,
//         deviceName: deviceName || "Default Printer",
//         copies,
//         silent 
//     });

//     try {
//         if (type === "zpl") {
//             console.log(" [ZPL] Starting ZPL print...");
//             if (!zpl) {
//                 throw new Error("Missing ZPL data");
//             }

//             console.log(" [ZPL] ZPL data length:", zpl.length);
//             console.log(" [ZPL] Sending to printer share:", ZPL_PRINTER_SHARE);

//             let allSucceeded = true;
//             for (let i = 0; i < copies; i++) {
//                 const ok = await sendZplWindows(zpl, ZPL_PRINTER_SHARE);
//                 if (ok) {
//                     console.log(` [ZPL] Copy ${i + 1}/${copies} sent successfully`);
//                 } else {
//                     console.error(`[ZPL] Copy ${i + 1}/${copies} failed`);
//                     allSucceeded = false;
//                 }
//             }

//             return allSucceeded;
//         }
//         if (type === "pdf-buffer" || type === "pdf-url") {
//             if (type === "pdf-buffer") {
//                 console.log("📄 [PDF-BUFFER] Processing PDF buffer...");
//                 if (!buffer) throw new Error("Missing PDF buffer");

//                 tempPath = path.join(os.tmpdir(), `label-${Date.now()}.pdf`);
//                 await fs.writeFile(tempPath, Buffer.from(buffer));
//             } 
//             else if (type === "pdf-url") {
//                 console.log("📄 [PDF-URL] Downloading PDF from:", url);
//                 if (!url) throw new Error("Missing PDF URL");

//                 tempPath = path.join(os.tmpdir(), `label-${Date.now()}.pdf`);

//                 const response = await fetch(url);
//                 if (!response.ok) throw new Error(`Failed to download PDF (${response.status})`);

//                 const arrayBuffer = await response.arrayBuffer();
//                 await fs.writeFile(tempPath, Buffer.from(arrayBuffer));
//             }

//             console.log("📄 PDF saved to temp:", tempPath);

//             printWin = new BrowserWindow({ show: false, webPreferences: { plugins: true } });
//             await printWin.loadURL(`file://${tempPath}`);
//             await new Promise(resolve => setTimeout(resolve, 1500));

//             const success = await new Promise((resolve) => {
//                 printWin.webContents.print({
//                     silent,
//                     deviceName: deviceName || undefined,
//                     copies,
//                     printBackground: true,
//                     marginsType: 0,
//                 }, (success, failureReason) => {
//                     if (success) console.log("✅ [PDF] Print job sent successfully");
//                     else console.error("❌ [PDF] Print failed:", failureReason);
//                     resolve(success);
//                 });
//             });

//             return success;
//         }

//         throw new Error("Invalid print type");

//     } catch (err) {
//         console.error("❌ [print-label] Print Error:", err);
//         return false;
//     } finally {
//         if (printWin && !printWin.isDestroyed()) {
//             printWin.close();
//         }

//         if (tempPath && fsSync.existsSync(tempPath)) {
//             try {
//                 fsSync.unlinkSync(tempPath);
//                 console.log("🧹 Temp file deleted");
//             } catch (e) {
//                 console.error("⚠️ Failed to delete temp file");
//             }
//         }
//     }
// });


// function checkInternetConnection() {
//     return new Promise((resolve) => {
//         dns.lookup('google.com', (err) => {
//             if (err) {
//                 isOffline = true;
//                 resolve(false);
//             } else {
//                 isOffline = false;
//                 resolve(true);
//             }
//         });
//     });
// }

// async function createWindow() {
//     const isDev = await import('electron-is-dev').then((module) => module.default);

//     // mainWindow = new BrowserWindow({
//     //     width: 800,
//     //     height: 600,
//     //     show: false,
//     //     simpleFullscreen: true,
//     //     title: APP_NAME,
//     //     icon: path.join(__dirname, '..', 'icons', 'icon.ico'),
//     //     webPreferences: {
//     //         nodeIntegration: false,
//     //         contextIsolation: true,
//     //         preload: path.join(__dirname, 'preload.js'),
//     //         webSecurity: true,
//     //     },
//     //     skipTaskbar: false,
//     //     minimizable: true,
//     //     closable: true,
//     // });
//     mainWindow = new BrowserWindow({
//         show: false,

//         width: 1920,
//         height: 1080,

//         minWidth: 1200,
//         minHeight: 700,

//         autoHideMenuBar: false,
//         backgroundColor: '#ffffff',
//         resizable:true,
//         minimizable:true,
//         maximizable:true,

//         title: APP_NAME,
//         icon: path.join(__dirname, '..', 'icons', 'icon.ico'),

//         webPreferences: {
//             nodeIntegration: false,
//             contextIsolation: true,
//             preload: path.join(__dirname, 'preload.js'),
//             webSecurity: true,
//         },
//         skipTaskbar:false,
//         minimizable:true,
//         closable:true,
//     });

//     mainWindow.maximize();


//     if (isDev) {
//         mainWindow.loadURL('http://localhost:3000');
//     } else {
//         const publicDirectory = path.join(__dirname, '../out');
//         server = http.createServer((request, response) => {
//             return handler(request, response, {
//                 public: publicDirectory,
//                 rewrites: [{ source: '**', destination: '/index.html' }],
//             });
//         });

//         server.listen(PORT, () => {
//             mainWindow.loadURL(`http://localhost:${PORT}`);
//         });
//     }

//     setInterval(() => {
//         if (mainWindow && !mainWindow.isDestroyed()) {
//             mainWindow.webContents.session.clearCache().then(() => {
//                 console.log('Cache cleared at:: ', new Date().toLocaleTimeString());
//             });
//         }
//     }, CACHE_CLEAR_INTERVAL);

//     // mainWindow.once('ready-to-show', async () => {
//     //     mainWindow.maximize();

//     //     mainWindow.show();
//     //     mainWindow.focus();
//     //     mainWindow.setAlwaysOnTop(true);
//     //     mainWindow.setAlwaysOnTop(false);

//     //     await checkInternetConnection();
//     // });

//     mainWindow.once('ready-to-show', async () => {
//         mainWindow.show();
//         mainWindow.focus();

//         mainWindow.setAlwaysOnTop(true);
//         mainWindow.setAlwaysOnTop(false);

//         await checkInternetConnection();
//     });

//     mainWindow.on('closed', () => {
//         mainWindow = null;
//     });

//     mainWindow.on('close', () => {
//         app.isQuiting = true;
//         app.quit();
//     });

//     // mainWindow.on('close', (event) => {
//     //     if (!app.isQuiting) {
//     //         event.preventDefault();
//     //         mainWindow.hide();

//     //         if (tray) {
//     //             tray.displayBalloon({
//     //                 iconType: 'info',
//     //                 title: APP_NAME,
//     //                 content: 'App is still running in the background. Right-click the tray icon to access options.',
//     //             });
//     //         }

//     //         return false;
//     //     }
//     // });

//     mainWindow.webContents.on('crashed', () => {
//         console.error('Window crashed, attempting to reload...');
//         if (!mainWindow.isDestroyed()) {
//             mainWindow.reload();
//         }
//     });

//     mainWindow.webContents.on('unresponsive', () => {
//         console.warn('Window became unresponsive');
//     });

//     mainWindow.webContents.on('responsive', () => {
//         console.log('Window became responsive again');
//     });

//     if (isDev) {
//         mainWindow.webContents.openDevTools();
//     }
// }

// function createTray() {
//     const iconPath = path.join(__dirname, '..', 'icons', 'icon.png');
//     tray = new Tray(iconPath);

//     const contextMenu = Menu.buildFromTemplate([
//         {
//             label: 'Show App',
//             click: () => {
//                 mainWindow.show();
//                 mainWindow.focus();
//             },
//         },
//         {
//             label: 'Quit App',
//             click: () => {
//                 app.isQuiting = true;
//                 app.quit();
//             },
//         },
//     ]);

//     tray.setToolTip(APP_NAME);
//     tray.setContextMenu(contextMenu);

//     tray.on('click', () => {
//         mainWindow.show();
//         mainWindow.focus();
//     });
// }

// const gotTheLock = app.requestSingleInstanceLock();

// if (!gotTheLock) {
//     app.quit();
// } else {
//     app.on('second-instance', () => {
//         if (mainWindow) {
//             if (mainWindow.isMinimized()) {
//                 mainWindow.restore();
//             }

//             if (!mainWindow.isVisible()) {
//                 mainWindow.show();
//             }

//             mainWindow.focus();

//             if (process.platform === 'win32') {
//                 mainWindow.setAlwaysOnTop(true);
//                 mainWindow.setAlwaysOnTop(false);
//                 mainWindow.showInactive();
//                 mainWindow.show();
//             }
//         } else {
//             createWindow();
//         }
//     });

//     app.on('ready', async () => {
//         // await createDefaultFolders();
//         await createWindow();
//         // createTray();

//          if (app.isPackaged) {
//             console.log('App ready')
//         autoUpdater.checkForUpdatesAndNotify();
//     }

//         powerMonitor.on('suspend', () => {
//             mainWindow.webContents.send('windows-sleep-mode', true);
//         });

//         powerMonitor.on('resume', async () => {
//             const isDev = await import('electron-is-dev').then((mod) => mod.default);

//             const execPath = isDev ? process.argv[0] : process.execPath;
//             const args = isDev ? [path.join(__dirname, '..')] : [];

//             setTimeout(() => {
//                 try {
//                     spawn(execPath, args, {
//                         detached: true,
//                         stdio: 'ignore',
//                     }).unref();

//                     setTimeout(() => {
//                         mainWindow.webContents.send('windows-sleep-mode', false);
//                     }, 5000);
//                 } catch (err) {
//                     console.error('Failed to relaunch app:', err);
//                 } finally {
//                     app.quit();
//                 }
//             }, 1000);
//         });
//     });

//     app.on('window-all-closed', () => {
//         if (process.platform !== 'darwin') {
//             app.quit();
//         }
//     });

//     app.on('will-quit', () => {
//         if (server) {
//             server.close(() => {});
//         }
//     });

//     app.on('activate', () => {
//         if (mainWindow === null) {
//             createWindow();
//         }
//     });
// }

// async function clearRendererStorage() {
//     if (mainWindow && !mainWindow.isDestroyed()) {
//         try {
//             await mainWindow.webContents.session.clearStorageData({
//                 storages: ['localStorage'],
//             });
//         } catch (error) {
//             console.error('Error clearing storage:', error);
//         }
//     }
// }

// app.on('will-uninstall', async (event) => {
//     event.preventDefault();
//     try {
//         await clearRendererStorage();
//     } catch (error) {
//         console.error('Error clearing renderer storage:', error);
//     }
//     event.continue();
// });

// ipcMain.handle('get-device-id', async () => {
//     return machineIdSync(true);
// });
const { app, BrowserWindow, ipcMain, powerMonitor, Tray, Menu,shell,dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const dns = require('dns');
const http = require('http');
const handler = require('serve-handler');
const { machineIdSync } = require('node-machine-id');
const fs = require('fs').promises
const fsSync = require('fs');
const os= require("os")
const { exec } = require("child_process");
const { autoUpdater } = require('electron-updater')
const log = require('electron-log');


const fingerprint = require('../fingerprint-addon');
const API_BASE_URL = process.env.API_BASE_URL || 'https://desktopretail.infoware.xyz';

const MIN_ENROLL_SAMPLES = 3;
const MAX_ENROLL_SAMPLES = 4;
const DEFAULT_ENROLL_SAMPLES = 4;

const FINGERPRINT_LOG_PATH = path.join(app.getPath('userData'), 'logs', 'fingerprint.log');
function fingerprintLog(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [${level}] ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
    try {
        const dir = path.dirname(FINGERPRINT_LOG_PATH);
        if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
        fsSync.appendFileSync(FINGERPRINT_LOG_PATH, message + '\n');
    } catch (_) { /* ignore log write failures */ }
    if (level === 'ERROR') console.error(message); else console.log(message);
}

function captureFingerprintSamples(sampleCount, onProgress) {
    return fingerprint.captureMultiple(sampleCount, (progress) => {
        try {
            onProgress && onProgress(progress);
        } catch (progressErr) {
            fingerprintLog('ERROR', '[Fingerprint] onProgress handler threw:', progressErr.message);
        }
    });
}

app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const APP_NAME = 'Infooware POS';

const BASE_IMPORTS_PATH = 'C:\\ProgramData\\DesktopRetail\\imports';

let isOffline = false;

let mainWindow;
let tray;
app.isQuiting = false;

const CACHE_CLEAR_INTERVAL = 30 * 60 * 1000;

let server;
const PORT = 3001;


ipcMain.on('app-offline', () => {
    isOffline = true;
});

ipcMain.on('app-online', async () => {
    isOffline = false;
});

ipcMain.on('exit-app', () => {
    app.quit();
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });

  if (result.canceled) return null;

  return result.filePaths[0];
});



ipcMain.on('reload-app', async () => {
    const isDev = await import('electron-is-dev').then((module) => module.default);
    if (mainWindow && mainWindow.webContents) {
        mainWindow.loadURL(isDev ? 'http://localhost:3000' : `http://localhost:${PORT}`);
    }
});

ipcMain.handle('get-printers', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return [];
    
    try {
        const printers = await win.webContents.getPrintersAsync();
        return printers;
    } catch (error) {
        console.error('Error getting printers:', error);
        return [];
    }
});

ipcMain.handle('download-pdf', async (_event, { fileName = 'document.pdf', base64 } = {}) => {
    try {
        if (!base64) {
            return { success: false, message: 'No PDF data provided' };
        }

        const result = await dialog.showSaveDialog({
            title: 'Save PDF',
            defaultPath: path.join(app.getPath('documents'), fileName),
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        });

        if (result.canceled || !result.filePath) {
            return { success: false, cancelled: true };
        }

        await fs.writeFile(result.filePath, Buffer.from(base64, 'base64'));

        shell.showItemInFolder(result.filePath);

        return { success: true, filePath: result.filePath };
    } catch (error) {
        console.error('Failed to save PDF:', error);
        return { success: false, message: String(error.message || error) };
    }
});

Object.assign(console, log.functions); 
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);

    mainWindow?.webContents.send("update-available", {
        version: info.version
    });
});

autoUpdater.on("checking-for-update", () => {
    console.log("Checking for update...");
});

autoUpdater.on("update-not-available", (info) => {
    console.log("No update available. Current version:", info.version);
});

autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info.version);

    mainWindow?.webContents.send("update-downloaded", {
        version: info.version
    });
});

autoUpdater.on("error", (error) => {
    console.error("Auto-update error:", error);
});

ipcMain.handle('print-pdf-from-url', async (_, payload) => {
    console.log('IPC print-pdf-from-url RECEIVED');

    const {
        url,
        deviceName,
        copies = 1,
        silent = true,
    } = payload || {};

    if (!url) {
        console.error('No PDF URL received');
        return false;
    }

    const tempPath = path.join(
        os.tmpdir(),
        `label-${Date.now()}.pdf`
    );

    let printWin = null;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        await fs.writeFile(
            tempPath,
            Buffer.from(arrayBuffer)
        );

        printWin = new BrowserWindow({
            show: false,
            webPreferences: {
                plugins: true,
            },
        });

        await printWin.loadURL(`file://${tempPath}`);

        await new Promise((resolve) => setTimeout(resolve, 1200));

        console.log(`Printing on ${deviceName || 'Default Printer'}...`);

        const success = await new Promise((resolve) => {
            printWin.webContents.print(
                {
                    silent,
                    deviceName: deviceName || undefined,
                    printBackground: true,
                    copies,
                    marginsType: 0,
                },
                (success, failureReason) => {
                    if (success) {
                        console.log('Print job sent successfully!');
                    } else {
                        console.error('Print failed:', failureReason);
                    }

                    resolve(success);
                }
            );
        });

        return success;
    } catch (error) {
        console.error('Error printing PDF from URL:', error);
        return false;
    } finally {
        if (printWin) {
            printWin.close();
        }

        if (fsSync.existsSync(tempPath)) {
            fsSync.unlinkSync(tempPath);
        }
    }
});

async function callFingerprintApi(pathSuffix, { method = 'GET', body, authToken, extraHeaders } = {}) {
    const url = `${API_BASE_URL}${pathSuffix}`;
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    console.log(`[Fingerprint API] -> ${method} ${url}`, body ? { body } : '', authToken ? '(authenticated)' : '(no auth)');

    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
        data = await response.json();
    } catch (err) {
        console.warn(`[Fingerprint API] <- ${method} ${url} returned non-JSON body`);
    }

    console.log(`[Fingerprint API] <- ${method} ${url} status=${response.status}`, data);

    if (!response.ok) {
        const message = (data && (data.message || data.error)) || `Request failed with status ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.body = data;
        throw error;
    }

    return data;
}


ipcMain.handle('fingerprint-enroll', async (_event, { userId, userName, deviceId, deviceName, authToken, sampleCount } = {}) => {
    fingerprintLog('INFO', '[Fingerprint] fingerprint-enroll IPC received.', { userId, userName, deviceId, deviceName, sampleCount, hasAuthToken: !!authToken });

    if (!userId || !deviceId || !authToken) {
        fingerprintLog('ERROR', '[Fingerprint] fingerprint-enroll FAILED: missing userId, deviceId, or authToken');
        return { success: false, error: 'userId, deviceId, and authToken are required' };
    }

    const requestedSamples = Number(sampleCount) || DEFAULT_ENROLL_SAMPLES;
    const targetSampleCount = Math.min(Math.max(requestedSamples, MIN_ENROLL_SAMPLES), MAX_ENROLL_SAMPLES);

    try {
        fingerprintLog('INFO', `[Fingerprint] Capturing ${targetSampleCount} samples... waiting for finger on reader`);

        const capture = await captureFingerprintSamples(targetSampleCount, (progress) => {
            fingerprintLog('INFO', '[Fingerprint] capture progress', progress);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('fingerprint-enroll-progress', progress);
            }
        });

        if (!capture.success) {
            fingerprintLog('ERROR', '[Fingerprint] Multi-capture failed:', capture.error);
            return { success: false, error: capture.error, rejectDetail: capture.rejectDetail };
        }

        fingerprintLog('INFO', `[Fingerprint] Captured ${capture.templateReferences.length} samples. Sending enroll request to backend...`);

        const data = await callFingerprintApi('/api/company/users/fingerprint/enroll', {
            method: 'POST',
            authToken,
            body: {
                userId,
                userName,
                deviceId,
                deviceName,
                templateReferences: capture.templateReferences,
            },
        });

        fingerprintLog('INFO', '[Fingerprint] Backend enroll SUCCESS for userId:', userId);
        return { success: true, data };
    } catch (err) {
        fingerprintLog('ERROR', '[Fingerprint] fingerprint-enroll EXCEPTION:', err.message, err.body || '');
        return { success: false, error: err.message, status: err.status, body: err.body };
    }
});

// Capture one fingerprint sample and return the base64 template to the renderer.
// Approval uses this directly in /security/approvals/approve, so the supervisor
// authenticates with the current scan instead of a separate fingerprint login.
ipcMain.handle('fingerprint-capture', async (_event, { deviceId } = {}) => {
    fingerprintLog('INFO', '[Fingerprint] fingerprint-capture IPC received.', { deviceId });

    try {
        fingerprintLog('INFO', '[Fingerprint] Capturing approval sample... waiting for finger on reader');
        const capture = await fingerprint.captureFingerprintSample();

        if (!capture.success) {
            fingerprintLog('ERROR', '[Fingerprint] Approval capture failed:', capture.error);
            return { success: false, error: capture.error, rejectDetail: capture.rejectDetail };
        }

        fingerprintLog(
            'INFO',
            '[Fingerprint] Approval capture succeeded. Template length:',
            capture.templateReference?.length || 0,
        );
        return {
            success: true,
            data: {
                templateReference: capture.templateReference,
                deviceId,
            },
        };
    } catch (err) {
        fingerprintLog('ERROR', '[Fingerprint] fingerprint-capture EXCEPTION:', err.message, err.body || '');
        return { success: false, error: err.message, status: err.status, body: err.body };
    }
});

ipcMain.handle('fingerprint-login', async (_event, { domainId, deviceId, terminalId, installationId, posLogin } = {}) => {
    fingerprintLog('INFO', '[Fingerprint] fingerprint-login IPC received.', { domainId, deviceId, terminalId });

    if (!domainId || !deviceId || !terminalId || !installationId) {
        fingerprintLog('ERROR', '[Fingerprint] fingerprint-login FAILED: missing domainId, deviceId, Terminal ID, or installation ID');
        return { success: false, error: 'domainId, deviceId, Terminal ID, and installation ID are required' };
    }

    try {
        fingerprintLog('INFO', '[Fingerprint] Capturing sample... waiting for finger on reader');
        const capture = await fingerprint.captureFingerprintSample();

        if (!capture.success) {
            fingerprintLog('ERROR', '[Fingerprint] Capture failed:', capture.error);
            return { success: false, error: capture.error, rejectDetail: capture.rejectDetail };
        }

        fingerprintLog('INFO', '[Fingerprint] Capture succeeded. Sending login request to backend...');

        const extraHeaders = {
            'X-Client-Type': 'DESKTOP',
            'Terminal-Id': terminalId,
            'X-Installation-Id': installationId,
        };
        fingerprintLog('INFO', '[Fingerprint] Attaching desktop client and terminal headers:', terminalId);

   
        const data = await callFingerprintApi('/api/company/users/fingerprint/login', {
            method: 'POST',
            extraHeaders,
            body: {
                domainId,
                deviceId,
                templateReference: capture.templateReference,
                posLogin: posLogin !== false,
            },
        });

        fingerprintLog('INFO', '[Fingerprint] Backend login SUCCESS. Received JWT/user response.');
        return {
            success: true,
            data: {
                ...data.data,
                message: data.data?.message || data.message,
            },
        };
    } catch (err) {
        fingerprintLog('ERROR', '[Fingerprint] fingerprint-login EXCEPTION:', err.message, err.body || '');
        return { success: false, error: err.message, status: err.status, body: err.body };
    }
});

ipcMain.handle('fingerprint-list', async (_event, { userId, authToken } = {}) => {
    fingerprintLog('INFO', '[Fingerprint] fingerprint-list IPC received.', { userId, hasAuthToken: !!authToken });

    if (!userId || !authToken) {
        fingerprintLog('ERROR', '[Fingerprint] fingerprint-list FAILED: missing userId or authToken');
        return { success: false, error: 'userId and authToken are required' };
    }

    try {
        const data = await callFingerprintApi(`/api/company/users/fingerprint/${encodeURIComponent(userId)}`, {
            method: 'GET',
            authToken,
        });

        fingerprintLog('INFO', '[Fingerprint] fingerprint-list SUCCESS. Count:', Array.isArray(data) ? data.length : 'n/a');
        return { success: true, data };
    } catch (err) {
        fingerprintLog('ERROR', '[Fingerprint] fingerprint-list EXCEPTION:', err.message, err.body || '');
        return { success: false, error: err.message, status: err.status, body: err.body };
    }
});

ipcMain.handle('fingerprint-remove', async (_event, { id, authToken } = {}) => {
    fingerprintLog('INFO', '[Fingerprint] fingerprint-remove IPC received.', { id, hasAuthToken: !!authToken });

    if (!id || !authToken) {
        fingerprintLog('ERROR', '[Fingerprint] fingerprint-remove FAILED: missing id or authToken');
        return { success: false, error: 'id and authToken are required' };
    }

    try {
        const data = await callFingerprintApi(`/api/company/users/fingerprint/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            authToken,
        });

        fingerprintLog('INFO', '[Fingerprint] fingerprint-remove SUCCESS for id:', id);
        return { success: true, data };
    } catch (err) {
        fingerprintLog('ERROR', '[Fingerprint] fingerprint-remove EXCEPTION:', err.message, err.body || '');
        return { success: false, error: err.message, status: err.status, body: err.body };
    }
});

const ZPL_PRINTER_SHARE = '\\\\localhost\\ZDesigner ZD421-203dpi ZPL';

async function sendZplWindows(zpl, printerShareName) {
    const tempPath = path.join(os.tmpdir(), `label-${Date.now()}.zpl`);
    await fs.writeFile(tempPath, zpl, 'utf8');

    return new Promise((resolve) => {
        exec(`copy /b "${tempPath}" "${printerShareName}"`, (err) => {
            fs.unlink(tempPath).catch(() => {});
            if (err) {
                console.error('ZPL print error:', err);
                resolve(false);
            } else {
                console.log('ZPL sent via copy /b');
                resolve(true);
            }
        });
    });
}

ipcMain.handle("print-label", async (_, payload) => {
    const {
        type,
        url,
        buffer,
        zpl,
        deviceName,
        copies = 1,
        silent = true,
    } = payload || {};

    let tempPath = null;
    let printWin = null;

    console.log("🖨️ [print-label] Received payload:", { 
        type, 
        hasZpl: !!zpl, 
        hasUrl: !!url, 
        hasBuffer: !!buffer,
        deviceName: deviceName || "Default Printer",
        copies,
        silent 
    });

    try {
        if (type === "zpl") {
            console.log(" [ZPL] Starting ZPL print...");
            if (!zpl) {
                throw new Error("Missing ZPL data");
            }

            console.log(" [ZPL] ZPL data length:", zpl.length);
            console.log(" [ZPL] Sending to printer share:", ZPL_PRINTER_SHARE);

            let allSucceeded = true;
            for (let i = 0; i < copies; i++) {
                const ok = await sendZplWindows(zpl, ZPL_PRINTER_SHARE);
                if (ok) {
                    console.log(` [ZPL] Copy ${i + 1}/${copies} sent successfully`);
                } else {
                    console.error(`[ZPL] Copy ${i + 1}/${copies} failed`);
                    allSucceeded = false;
                }
            }

            return allSucceeded;
        }
        if (type === "pdf-buffer" || type === "pdf-url") {
            if (type === "pdf-buffer") {
                console.log("📄 [PDF-BUFFER] Processing PDF buffer...");
                if (!buffer) throw new Error("Missing PDF buffer");

                tempPath = path.join(os.tmpdir(), `label-${Date.now()}.pdf`);
                await fs.writeFile(tempPath, Buffer.from(buffer));
            } 
            else if (type === "pdf-url") {
                console.log("📄 [PDF-URL] Downloading PDF from:", url);
                if (!url) throw new Error("Missing PDF URL");

                tempPath = path.join(os.tmpdir(), `label-${Date.now()}.pdf`);

                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to download PDF (${response.status})`);

                const arrayBuffer = await response.arrayBuffer();
                await fs.writeFile(tempPath, Buffer.from(arrayBuffer));
            }

            console.log("📄 PDF saved to temp:", tempPath);

            printWin = new BrowserWindow({ show: false, webPreferences: { plugins: true } });
            await printWin.loadURL(`file://${tempPath}`);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const success = await new Promise((resolve) => {
                printWin.webContents.print({
                    silent,
                    deviceName: deviceName || undefined,
                    copies,
                    printBackground: true,
                    marginsType: 0,
                }, (success, failureReason) => {
                    if (success) console.log("✅ [PDF] Print job sent successfully");
                    else console.error("❌ [PDF] Print failed:", failureReason);
                    resolve(success);
                });
            });

            return success;
        }

        throw new Error("Invalid print type");

    } catch (err) {
        console.error("❌ [print-label] Print Error:", err);
        return false;
    } finally {
        if (printWin && !printWin.isDestroyed()) {
            printWin.close();
        }

        if (tempPath && fsSync.existsSync(tempPath)) {
            try {
                fsSync.unlinkSync(tempPath);
                console.log("🧹 Temp file deleted");
            } catch (e) {
                console.error("⚠️ Failed to delete temp file");
            }
        }
    }
});


function checkInternetConnection() {
    return new Promise((resolve) => {
        dns.lookup('google.com', (err) => {
            if (err) {
                isOffline = true;
                resolve(false);
            } else {
                isOffline = false;
                resolve(true);
            }
        });
    });
}

async function createWindow() {
    const isDev = await import('electron-is-dev').then((module) => module.default);

    // mainWindow = new BrowserWindow({
    //     width: 800,
    //     height: 600,
    //     show: false,
    //     simpleFullscreen: true,
    //     title: APP_NAME,
    //     icon: path.join(__dirname, '..', 'icons', 'icon.ico'),
    //     webPreferences: {
    //         nodeIntegration: false,
    //         contextIsolation: true,
    //         preload: path.join(__dirname, 'preload.js'),
    //         webSecurity: true,
    //     },
    //     skipTaskbar: false,
    //     minimizable: true,
    //     closable: true,
    // });
    mainWindow = new BrowserWindow({
        show: false,

        width: 1920,
        height: 1080,

        minWidth: 1200,
        minHeight: 700,

        autoHideMenuBar: false,
        backgroundColor: '#ffffff',
        resizable:true,
        minimizable:true,
        maximizable:true,

        title: APP_NAME,
        icon: path.join(__dirname, '..', 'icons', 'icon.ico'),

        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
        },
        skipTaskbar:false,
        minimizable:true,
        closable:true,
    });

    mainWindow.maximize();


    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        const publicDirectory = path.join(__dirname, '../out');
        server = http.createServer((request, response) => {
            return handler(request, response, {
                public: publicDirectory,
                rewrites: [{ source: '**', destination: '/index.html' }],
            });
        });

        server.listen(PORT, () => {
            mainWindow.loadURL(`http://localhost:${PORT}`);
        });
    }

    setInterval(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.session.clearCache().then(() => {
                console.log('Cache cleared at:: ', new Date().toLocaleTimeString());
            });
        }
    }, CACHE_CLEAR_INTERVAL);

    // mainWindow.once('ready-to-show', async () => {
    //     mainWindow.maximize();

    //     mainWindow.show();
    //     mainWindow.focus();
    //     mainWindow.setAlwaysOnTop(true);
    //     mainWindow.setAlwaysOnTop(false);

    //     await checkInternetConnection();
    // });

    mainWindow.once('ready-to-show', async () => {
        mainWindow.show();
        mainWindow.focus();

        mainWindow.setAlwaysOnTop(true);
        mainWindow.setAlwaysOnTop(false);

        await checkInternetConnection();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('close', () => {
        app.isQuiting = true;
        app.quit();
    });

    // mainWindow.on('close', (event) => {
    //     if (!app.isQuiting) {
    //         event.preventDefault();
    //         mainWindow.hide();

    //         if (tray) {
    //             tray.displayBalloon({
    //                 iconType: 'info',
    //                 title: APP_NAME,
    //                 content: 'App is still running in the background. Right-click the tray icon to access options.',
    //             });
    //         }

    //         return false;
    //     }
    // });

    mainWindow.webContents.on('crashed', () => {
        console.error('Window crashed, attempting to reload...');
        if (!mainWindow.isDestroyed()) {
            mainWindow.reload();
        }
    });

    mainWindow.webContents.on('unresponsive', () => {
        console.warn('Window became unresponsive');
    });

    mainWindow.webContents.on('responsive', () => {
        console.log('Window became responsive again');
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

function createTray() {
    const iconPath = path.join(__dirname, '..', 'icons', 'icon.png');
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            },
        },
        {
            label: 'Quit App',
            click: () => {
                app.isQuiting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip(APP_NAME);
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }

            if (!mainWindow.isVisible()) {
                mainWindow.show();
            }

            mainWindow.focus();

            if (process.platform === 'win32') {
                mainWindow.setAlwaysOnTop(true);
                mainWindow.setAlwaysOnTop(false);
                mainWindow.showInactive();
                mainWindow.show();
            }
        } else {
            createWindow();
        }
    });

    app.on('ready', async () => {
        // await createDefaultFolders();
        await createWindow();
        // createTray();

         if (app.isPackaged) {
            console.log('App ready')
        autoUpdater.checkForUpdatesAndNotify();
    }

        powerMonitor.on('suspend', () => {
            mainWindow.webContents.send('windows-sleep-mode', true);
        });

        powerMonitor.on('resume', async () => {
            const isDev = await import('electron-is-dev').then((mod) => mod.default);

            const execPath = isDev ? process.argv[0] : process.execPath;
            const args = isDev ? [path.join(__dirname, '..')] : [];

            setTimeout(() => {
                try {
                    spawn(execPath, args, {
                        detached: true,
                        stdio: 'ignore',
                    }).unref();

                    setTimeout(() => {
                        mainWindow.webContents.send('windows-sleep-mode', false);
                    }, 5000);
                } catch (err) {
                    console.error('Failed to relaunch app:', err);
                } finally {
                    app.quit();
                }
            }, 1000);
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('will-quit', () => {
        if (server) {
            server.close(() => {});
        }
    });

    app.on('activate', () => {
        if (mainWindow === null) {
            createWindow();
        }
    });
}

async function clearRendererStorage() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            await mainWindow.webContents.session.clearStorageData({
                storages: ['localStorage'],
            });
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }
}

app.on('will-uninstall', async (event) => {
    event.preventDefault();
    try {
        await clearRendererStorage();
    } catch (error) {
        console.error('Error clearing renderer storage:', error);
    }
    event.continue();
});

ipcMain.handle('get-device-id', async () => {
    return machineIdSync(true);
});