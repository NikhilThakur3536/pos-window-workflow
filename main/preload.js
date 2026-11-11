const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Device Id
    getDeviceId: async () => {
        return await ipcRenderer.invoke('get-device-id');
    },

    // Fingerprint
    enrollFingerprint: (payload) => ipcRenderer.invoke('fingerprint-enroll', payload),
    listFingerprints: (payload) => ipcRenderer.invoke('fingerprint-list', payload),
    removeFingerprint: (payload) => ipcRenderer.invoke('fingerprint-remove', payload),
    fingerprintLogin: (payload) => ipcRenderer.invoke('fingerprint-login', payload),
    fingerprintCapture: (payload) => ipcRenderer.invoke('fingerprint-capture', payload),
    onFingerprintEnrollProgress: (callback) => ipcRenderer.on('fingerprint-enroll-progress', (_, value) => callback(value)),
    removeFingerprintEnrollProgressListeners: () => ipcRenderer.removeAllListeners('fingerprint-enroll-progress'),

    

    // Internet Connection
    notifyOffline: () => ipcRenderer.send('app-offline'),
    notifyOnline: () => ipcRenderer.send('app-online'),

    // Sleep Mode
    onSleepMode: (callback) => ipcRenderer.on('windows-sleep-mode', (_, value) => callback(value)),
    removeSleepModeListeners: () => ipcRenderer.removeAllListeners('windows-sleep-mode'),

    // Exit App
    exitApp: () => ipcRenderer.send('exit-app'),

    // Reload App
    reloadApp: () => ipcRenderer.send('reload-app'),
    importCSV: (payload) => ipcRenderer.invoke('save-to-folder', payload),
    saveToFolder: (payload) => ipcRenderer.invoke('save-to-folder', payload),
    selectFile:() =>ipcRenderer.invoke('select-file'),
    openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    // print: (pdfUrl, options) => ipcRenderer.invoke('print-pdf', pdfUrl, options),
    printPdf: (payload) => ipcRenderer.invoke('print-pdf', payload),
    printPdfFromUrl: (payload) => ipcRenderer.invoke('print-pdf-from-url', payload),
    printLabel: (payload) => ipcRenderer.invoke('print-label', payload),
    downloadPdf: (payload) => ipcRenderer.invoke('download-pdf', payload)
});
