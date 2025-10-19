import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("studynest", {
  platform: process.platform,
  ai: {
    choosePdf: async (): Promise<string | null> => {
      return ipcRenderer.invoke("dialog:choose-pdf");
    },
    analyzePdfOffline: async (filePath: string): Promise<{
      subjects: Array<{ name: string; chapters: string[] }>;
    }> => {
      return ipcRenderer.invoke("ai:analyze-pdf-offline", { filePath });
    }
  }
});
