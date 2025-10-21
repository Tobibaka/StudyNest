import { app, BrowserWindow, nativeTheme, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// --- Heuristic syllabus extractor (offline) ---
const extractSyllabusHeuristic = (rawText: string): {
  subjects: Array<{ name: string; chapters: string[] }>;
} => {
  // Normalize text
  const text = rawText
    .replace(/\u0000/g, "")
    .replace(/\ufeff/g, "")
    .replace(/\u00A0/g, " ");

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const subjects: Array<{ name: string; chapters: string[] }> = [];
  let currentSubject: { name: string; chapters: string[] } | null = null;

  // Match: Subject 1: Name, Subject I: Name, Subject - Name, etc.
  const subjectPattern = /^Subject\s*(?:No\.?\s*)?(?:[IVXLC0-9]+)?\s*[:\-–—]?\s*(.+)$/i;
  
  // Match: Chapter 1: Title, Module 2 - Title, Unit I: Title
  const chapterPattern = /^(?:Chapter|Module|Unit)\s*(?:[IVXLC0-9]+)?\s*[:\-–—]?\s*(.+)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a Subject line
    const subjMatch = subjectPattern.exec(line);
    if (subjMatch) {
      const subjectName = subjMatch[1].trim();
      if (subjectName.length >= 3) {
        console.log(`✅ SUBJECT FOUND: "${subjectName}"`);
        currentSubject = { name: subjectName, chapters: [] };
        subjects.push(currentSubject);
        continue;
      }
    }

    // Check if this is a Chapter line
    const chapMatch = chapterPattern.exec(line);
    if (chapMatch) {
      const chapterTitle = chapMatch[1].trim();
      if (chapterTitle.length >= 3) {
        if (!currentSubject) {
          console.log(`⚠️ Chapter found but no subject exists, creating fallback`);
          currentSubject = { name: "Imported Syllabus", chapters: [] };
          subjects.push(currentSubject);
        }
        console.log(`✅ CHAPTER ADDED: "${chapterTitle}" → Subject: "${currentSubject.name}"`);
        currentSubject.chapters.push(chapterTitle);
        continue;
      }
    }

    // If line starts with bullet, treat as chapter
    const bulletMatch = /^[•●▪■◦‣⁃·∙\-*]\s*(.+)$/.exec(line);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();
      // Check if bullet line is actually a module/chapter
      const bulletChapMatch = chapterPattern.exec(content);
      if (bulletChapMatch) {
        const chapterTitle = bulletChapMatch[1].trim();
        if (chapterTitle.length >= 3) {
          if (!currentSubject) {
            currentSubject = { name: "Imported Syllabus", chapters: [] };
            subjects.push(currentSubject);
          }
          console.log(`✅ BULLET CHAPTER: "${chapterTitle}" → Subject: "${currentSubject.name}"`);
          currentSubject.chapters.push(chapterTitle);
        }
      } else if (content.length >= 5) {
        if (!currentSubject) {
          currentSubject = { name: "Imported Syllabus", chapters: [] };
          subjects.push(currentSubject);
        }
        console.log(`✅ BULLET CONTENT: "${content}" → Subject: "${currentSubject.name}"`);
        currentSubject.chapters.push(content);
      }
    }
  }

  // Remove duplicates
  for (const subj of subjects) {
    const seen = new Set<string>();
    subj.chapters = subj.chapters.filter((ch) => {
      const key = ch.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (subjects.length === 0) {
    return { subjects: [{ name: "Imported Syllabus", chapters: [] }] };
  }

  console.log(`\n📊 FINAL RESULT: ${subjects.length} subjects found`);
  subjects.forEach((s, idx) => {
    console.log(`  ${idx + 1}. "${s.name}" - ${s.chapters.length} chapters`);
  });

  return { subjects };
};

const createMainWindow = async (): Promise<BrowserWindow> => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#111827" : "#ffffff",
    title: "StudyNest",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  if (isDev && VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  return win;
};

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Open file dialog to choose a PDF (renderer cannot access absolute path reliably)
ipcMain.handle("dialog:choose-pdf", async () => {
  const res = await dialog.showOpenDialog({
    title: "Choose a PDF",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
    properties: ["openFile"]
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

// Offline PDF analysis using heuristic (no API key required)
ipcMain.handle(
  "ai:analyze-pdf-offline",
  async (_event, { filePath }: { filePath: string }): Promise<{
    subjects: Array<{ name: string; chapters: string[] }>;
  }> => {
    const pdfParse = (await import("pdf-parse")).default as unknown as (
      data: Buffer
    ) => Promise<{ text: string }>;
    const fileBuf = await fs.readFile(filePath);
    const { text } = await pdfParse(fileBuf);
    return extractSyllabusHeuristic(text);
  }
);
