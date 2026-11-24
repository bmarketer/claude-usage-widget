const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  usage: {
    onData: (cb) => ipcRenderer.on('usage:data', (_e, payload) => cb(payload)),
    refresh: () => ipcRenderer.invoke('usage:refresh'),
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
  },
  win: {
    togglePin: () => ipcRenderer.invoke('win:togglePin'),
    setExpanded: (expanded) => ipcRenderer.invoke('win:setExpanded', expanded),
    setHeight: (height) => ipcRenderer.invoke('win:setHeight', height),
    setScale: (scale) => ipcRenderer.invoke('win:setScale', scale),
    onScale: (cb) => ipcRenderer.on('win:scale', (_e, scale) => cb(scale)),
  },
  banner: {
    onShow: (cb) => ipcRenderer.on('banner:show', (_e, msg) => cb(msg)),
    done: () => ipcRenderer.send('banner:done'),
  },
  app: {
    openHelp: () => ipcRenderer.invoke('app:openHelp'),
    openReleases: () => ipcRenderer.invoke('app:openReleases'),
    onUpdate: (cb) => ipcRenderer.on('app:update', (_e, info) => cb(info)),
  },
});
