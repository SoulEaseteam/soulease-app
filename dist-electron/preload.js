import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    receive: (channel, callback) => {
        ipcRenderer.on(channel, (_, ...args) => callback(...args));
    },
});
