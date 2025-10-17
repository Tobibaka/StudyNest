import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("studynest", {
  platform: process.platform
});
