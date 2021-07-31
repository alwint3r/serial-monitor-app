const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld('darkMode', {
  toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
});

contextBridge.exposeInMainWorld('rendererIpc', {
  on: (event, callback) => {
    ipcRenderer.on(event, callback);
  },

  removeEventListener: (event, callback) => {
    ipcRenderer.removeListener(event, callback);
  },

  once: (event, callback) => {
    ipcRenderer.once(event, callback);
  },

  send: (event, message) => {
    ipcRenderer.send(event, message);
  },
});