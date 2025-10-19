import { app, BrowserWindow, nativeTheme, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// --- Heuristic syllabus extractor (offline) ---
const extractSyllabusHeuristic = (rawText: string): {
  subjects: Array<{ name: string; chapters: string[] }>;
} => {
  // Normalize text: remove nulls and insert newlines before inline bullets/enumerations
  const bulletSep = `[•●▪■◦‣⁃·∙○◉◆▶►▸➤➔–—\-]|->|→|\\(\\d+\\)|\\d+[.)]|[A-Za-z][.)]`;
  const text = rawText
    .replace(/\u0000/g, "")
    // Newline before inline bullet-like tokens when not already at line start
    .replace(new RegExp(`([^\n])\s+(${bulletSep})\s+`, "g"), "$1\n$2 ")
    // Also handle arrows without trailing space cases
    .replace(/([^\n])\s+(->|→)(?=\S)/g, "$1\n$2 ");
  const lines = text
    .split(/\r?\n+/)
    .map((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return null;
      // Detect a wide range of bullet/enum prefixes at line start
      // Examples: • ● ▪ ■ ◦ ‣ ⁃ · ∙ ○ ◉ ◆ ▶ ► ▸ ➤ ➔ – — - -> → (1) 1. 1) a) A) and private-use symbols (e.g., Wingdings)
      const bulletRegex = /^(?:\s*(?:[•●▪■◦‣⁃·∙○◉◆▶►▸➤➔–—\-]|->|→|\(\d+\)|\d+[.)]|[A-Za-z][.)])\s*)(.+)$/;
      const privateBulletRegex = /^(?:[\uE000-\uF8FF]{1,3})\s+(.+)$/; // private-use area
      let wasBullet = false;
      let payload = trimmed;
      const m1 = bulletRegex.exec(trimmed);
      if (m1) {
        wasBullet = true;
        payload = m1[1];
      } else {
        const m2 = privateBulletRegex.exec(trimmed);
        if (m2) {
          wasBullet = true;
          payload = m2[1];
        }
      }
      // Keep reasonably long lines; some PDFs merge long bullet lines
      if (!payload || payload.length >= 500) return null;
      return { text: payload, wasBullet } as const;
    })
    .filter((entry): entry is { text: string; wasBullet: boolean } => Boolean(entry));

  const subjects: Array<{ name: string; chapters: string[] }> = [];
  let currentSubject: { name: string; chapters: string[] } | null = null;

  const subjectRe = /^(Subject|Course|Paper)[:\s-]*([^:]{3,60})$/i;
  // Accept ASCII hyphen and en/em dashes around separators
  const chapterHeaderRe = /^(Chapter|Unit|Module)\s*[\-\/:–—]?\s*(?:Module\s*)?([IVXLC]+|\d{1,3})?\s*[:.\-–—)]?\s*(.*)$/i;
  const tildeLineRe = /^~\s*(.+)$/;

  const isLikelyChapter = (s: string) => {
    const hasSpaces = s.includes(" ");
    const isAllCaps = /[A-Z]{3,}/.test(s) && !/[a-z]/.test(s);
    const isTitleCase = hasSpaces && s.split(" ").every((w) => w.length <= 20 && /^[A-Z][a-z\d\-()']*$/.test(w));
    return (isAllCaps || isTitleCase) && s.length >= 4 && s.length <= 100;
  };

  const isLikelySubject = (s: string) => {
    if (s.length < 3 || s.length > 80) return false;
    if (/[:;.,]$/.test(s)) return false;
    if (s.includes(":")) return false;
    const words = s.split(/\s+/);
    const isAllCaps = /[A-Z]{3,}/.test(s) && !/[a-z]/.test(s);
    const titleCaseCount = words.filter((w) => /^[A-Z][a-z\d\-()']{1,}$/.test(w)).length;
    return isAllCaps || titleCaseCount >= Math.max(1, Math.floor(words.length * 0.6));
  };

  let lastAddedWasChapter = false;

  for (let i = 0; i < lines.length; i++) {
    const { text: line, wasBullet } = lines[i];
    const nextEntry = lines[i + 1];
    const nextLine = nextEntry?.text;
    const nextWasBullet = nextEntry?.wasBullet ?? false;
    const prevEntry = lines[i - 1];
    const prevWasBullet = prevEntry?.wasBullet ?? false;

    const tildeMatch = tildeLineRe.exec(line);
    if (tildeMatch) {
      const payload = tildeMatch[1].trim();
      if (!currentSubject) {
        currentSubject = { name: "Imported Syllabus", chapters: [] };
        subjects.push(currentSubject);
      }
      const headerMatch = chapterHeaderRe.exec(payload);
      let chapterTitle = payload;
      if (headerMatch) {
        const body = headerMatch[3]?.trim() ?? "";
        const fallbackLabel = (headerMatch[1] + (headerMatch[2] ? ` ${headerMatch[2]}` : "")).trim();
        chapterTitle = body || fallbackLabel;
      }
      chapterTitle = chapterTitle.replace(/^[:\-\)\s]+/, "").replace(/\s{2,}/g, " ").trim();
      if (chapterTitle.length === 0) chapterTitle = "Untitled Chapter";
      currentSubject.chapters.push(chapterTitle);
      lastAddedWasChapter = true;
      continue;
    }

    // Explicit Subject: line
    const subj = subjectRe.exec(line);
    if (subj) {
      const name = subj[2].trim().replace(/\s{2,}/g, " ");
      currentSubject = { name, chapters: [] };
      subjects.push(currentSubject);
      lastAddedWasChapter = false;
      continue;
    }

    const cleanedCandidate = line.replace(/^<+|>+$/g, "").trim();
    const nextIsTilde = nextLine ? tildeLineRe.test(nextLine) : false;
    const nextIsModule = nextLine ? chapterHeaderRe.test(nextLine) : false;
    const subjectCandidate =
      !chapterHeaderRe.test(cleanedCandidate) &&
      isLikelySubject(cleanedCandidate) &&
      (i === 0 || nextWasBullet || nextIsModule);

    // Inferred subject heading
    if (subjectCandidate && cleanedCandidate.length >= 3 && !prevWasBullet) {
      const name = cleanedCandidate.replace(/\s{2,}/g, " ");
      currentSubject = { name, chapters: [] };
      subjects.push(currentSubject);
      lastAddedWasChapter = false;
      continue;
    }

    // Chapter header line
    const chap = chapterHeaderRe.exec(line);
    if (chap) {
      const titleRaw = chap[3]?.trim() ?? "";
      let title = titleRaw;
      if (!title) {
        for (let k = 1; k <= 3 && i + k < lines.length; k++) {
          const ahead = lines[i + k];
          if (isLikelyChapter(ahead.text)) {
            title = ahead.text;
            break;
          }
        }
      }
      if (!currentSubject) {
        currentSubject = { name: "Imported Syllabus", chapters: [] };
        subjects.push(currentSubject);
      }
      const num = chap[2];
      const label = (title ? title : `${chap[1]} ${num}`).replace(/\s{2,}/g, " ");
      currentSubject.chapters.push(label);
      lastAddedWasChapter = true;
      continue;
    }

    // Bullet treated as chapter
    if (wasBullet && line.length >= 3) {
      if (!currentSubject) {
        currentSubject = { name: "Imported Syllabus", chapters: [] };
        subjects.push(currentSubject);
      }
      let chapterTitle = line;
      const headerMatch = chapterHeaderRe.exec(line);
      if (headerMatch) {
        const body = headerMatch[3]?.trim() ?? "";
        const fallbackLabel = (headerMatch[1] + (headerMatch[2] ? ` ${headerMatch[2]}` : "")).trim();
        chapterTitle = body || fallbackLabel;
      }
      chapterTitle = chapterTitle.replace(/^[:\-\)\s]+/, "").replace(/\s{2,}/g, " ").trim();
      if (!chapterTitle) chapterTitle = "Untitled Chapter";
      currentSubject.chapters.push(chapterTitle);
      lastAddedWasChapter = true;
      continue;
    }

    // Continuation: append to last chapter, but avoid swallowing a new subject heading
    if (
      lastAddedWasChapter &&
      !wasBullet &&
      !chapterHeaderRe.test(line) &&
      !subjectRe.test(line) &&
      !(isLikelySubject(line) && (nextWasBullet || nextIsModule))
    ) {
      if (currentSubject && currentSubject.chapters.length > 0) {
        const lastIdx = currentSubject.chapters.length - 1;
        currentSubject.chapters[lastIdx] = (currentSubject.chapters[lastIdx] + " " + line)
          .replace(/\s{2,}/g, " ")
          .trim();
      }
      continue;
    }

    // Fallback: strong standalone title as chapter
    if (isLikelyChapter(line)) {
      if (!currentSubject) {
        currentSubject = { name: "Imported Syllabus", chapters: [] };
        subjects.push(currentSubject);
      }
      const last = currentSubject.chapters[currentSubject.chapters.length - 1];
      if (!last || last.toLowerCase() !== line.toLowerCase()) {
        currentSubject.chapters.push(line);
        lastAddedWasChapter = true;
      }
    }
  }

  // Deduplicate chapters and trim
  for (const s of subjects) {
    const seen = new Set<string>();
    s.chapters = s.chapters
      .map((c) => c.trim().replace(/^[\dIVXLC]+[).\-:\s]+/i, "").replace(/\s{2,}/g, " "))
      .filter((c) => {
        const key = c.toLowerCase();
        if (seen.has(key) || c.length < 3) return false;
        seen.add(key);
        return true;
      });
  }

  if (subjects.length === 0) {
    return { subjects: [{ name: "Imported Syllabus", chapters: [] }] };
  }
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
