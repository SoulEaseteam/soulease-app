// electron/preload.ts

import { contextBridge, ipcRenderer } from 'electron';

// ปลอดภัย: ใช้ contextBridge เปิด API ไปยังฝั่ง Renderer (React)
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
});