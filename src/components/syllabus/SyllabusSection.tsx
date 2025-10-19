 import {
  useState,
  ChangeEvent,
  FormEvent,
  useMemo,
  DragEvent,
  useEffect,
  useRef
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type Subject,
  type Chapter,
  type ChapterResource,
  type ChapterLink
} from "@store/db";
import TopBar from "@components/TopBar";
import {
  addSubject,
  addChapter,
  toggleChapter,
  deleteSubject,
  deleteChapter,
  addChapterResource,
  addChapterLink,
  deleteChapterResource
} from "@store/syllabusService";
import classNames from "classnames";
import { XMarkIcon } from "@heroicons/react/24/outline";

type ConfirmTarget =
  | { type: "subject"; id: number; name: string }
  | { type: "chapter"; id: number; title: string; subjectId: number }
  | { type: "resource"; id: number; name: string };

const SyllabusSection = () => {
  const [subjectDraft, setSubjectDraft] = useState("");
  const [search, setSearch] = useState("");
  const [chapterDrafts, setChapterDrafts] = useState<Record<number, string>>({});
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  // AI Import (offline) state
  const [importPath, setImportPath] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<
    | {
        subjects: Array<{ name: string; chapters: string[] }>;
      }
    | null
  >(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [importDragActive, setImportDragActive] = useState(false);

  const subjects = useLiveQuery<Subject[]>(() => db.subjects.orderBy("createdAt").toArray(), []);
  const chapters = useLiveQuery<Chapter[]>(() => db.chapters.toArray(), []);
  const resources = useLiveQuery<ChapterResource[] | undefined>(
    () => (activeChapterId ? db.chapterResources.where({ chapterId: activeChapterId }).toArray() : undefined),
    [activeChapterId]
  );
  const links = useLiveQuery<ChapterLink[] | undefined>(
    () => (activeChapterId ? db.chapterLinks.where({ chapterId: activeChapterId }).toArray() : undefined),
    [activeChapterId]
  );
  const resourceList = resources ?? [];
  const linkList = links ?? [];

  const filteredSubjects = useMemo(() => {
    const list = subjects ?? [];
    if (!search.trim()) return list;
    return list.filter((subject: Subject) =>
      subject.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [subjects, search]);

  const chaptersBySubject = new Map<number, Chapter[]>();
  for (const chapter of chapters ?? []) {
    const current = chaptersBySubject.get(chapter.subjectId) ?? [];
    current.push(chapter);
    chaptersBySubject.set(chapter.subjectId, current);
  }

  const handleAddSubject = async () => {
    if (!subjectDraft.trim()) return;
    await addSubject(subjectDraft);
    setSubjectDraft("");
  };

  const handleAddChapter = async (subjectId: number) => {
    const draft = chapterDrafts[subjectId];
    if (!draft) return;
    await addChapter(subjectId, draft);
    setChapterDrafts((prev: Record<number, string>) => ({ ...prev, [subjectId]: "" }));
  };

  const performDeleteSubject = async (subjectId: number) => {
    if (activeChapterId) {
      const activeChapter = chapters?.find((chapter) => chapter.id === activeChapterId);
      if (activeChapter && activeChapter.subjectId === subjectId) {
        setActiveChapterId(null);
      }
    }
    await deleteSubject(subjectId);
  };

  const performDeleteChapter = async (chapterId: number) => {
    if (activeChapterId === chapterId) {
      setActiveChapterId(null);
    }
    await deleteChapter(chapterId);
  };

  const performDeleteResource = async (resourceId: number) => {
    await deleteChapterResource(resourceId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    if (confirmTarget.type === "subject") {
      await performDeleteSubject(confirmTarget.id);
    } else if (confirmTarget.type === "chapter") {
      await performDeleteChapter(confirmTarget.id);
    } else if (confirmTarget.type === "resource") {
      await performDeleteResource(confirmTarget.id);
    }
    setConfirmTarget(null);
  };

  const completionPercent = (subjectId: number) => {
    const list = chaptersBySubject.get(subjectId) ?? [];
    if (list.length === 0) return 0;
    const completed = list.filter((item) => item.completed).length;
    return Math.round((completed / list.length) * 100);
  };

  const activeChapter = useMemo(() => {
    if (!activeChapterId) return undefined;
    return chapters?.find((chapter) => chapter.id === activeChapterId);
  }, [activeChapterId, chapters]);

  useEffect(() => {
    setLinkLabel("");
    setLinkUrl("");
    setIsDragActive(false);
  }, [activeChapterId]);

  const handleResourceDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    if (!activeChapterId) return;
    const files = Array.from(event.dataTransfer.files ?? []);
    for (const file of files) {
      if (!file) continue;
      const valid = file.type === "application/pdf" || file.type.startsWith("image/");
      if (!valid) continue;
      await addChapterResource(activeChapterId, file);
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!activeChapterId) return;
    const files = Array.from(event.target.files ?? []);
    for (const file of files) {
      const valid = file.type === "application/pdf" || file.type.startsWith("image/");
      if (!valid) continue;
      await addChapterResource(activeChapterId, file);
    }
    event.target.value = "";
  };

  const handleAddLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeChapterId) return;
    await addChapterLink(activeChapterId, linkLabel, linkUrl);
    setLinkLabel("");
    setLinkUrl("");
  };

  // State for hover instructions in Time Saver Zone
  const [showPromptInstructions, setShowPromptInstructions] = useState(false);

  // Shooting star tracks for the import panel backdrop
  const shootingTracks = useMemo(
    () => [
      { top: "8%", left: "10%", delay: "0s", duration: "2.8s" },
      { top: "22%", left: "65%", delay: "0.8s", duration: "3.2s" },
      { top: "38%", left: "25%", delay: "1.6s", duration: "2.5s" },
      { top: "52%", left: "80%", delay: "2.4s", duration: "3s" },
      { top: "68%", left: "15%", delay: "3.2s", duration: "2.7s" },
      { top: "82%", left: "55%", delay: "4s", duration: "3.1s" }
    ],
    []
  );

  // ChatGPT prompt for extracting syllabus
  const chatGptPrompt = `Please extract all subjects and their chapters/modules from this syllabus PDF. Format your response as:

Subject 1: [Subject Name]
Chapter 1: [Chapter Title]
Chapter 2: [Chapter Title]
...

Subject 2: [Next Subject Name]
Chapter 1: [Chapter Title]
...`;

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(chatGptPrompt);
    alert("Prompt copied! Now paste it in ChatGPT along with your PDF.");
  };

  // --- Offline AI Import helpers ---
  const openPdfPicker = async () => {
    try {
      const p = await (window as any)?.studynest?.ai?.choosePdf?.();
      if (p) {
        setImportPath(p);
        setAiResult(null);
        setAiError(null);
      }
    } catch (err: any) {
      setAiError(String(err?.message || err));
    }
  };

  const analyzeOfflineWithPath = async (filePath: string) => {
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await (window as any)?.studynest?.ai?.analyzePdfOffline?.(filePath);
      if (res && Array.isArray(res.subjects)) {
        setAiResult(res);
      } else {
        setAiError("Could not extract syllabus from PDF");
      }
    } catch (err: any) {
      setAiError(String(err?.message || err));
    } finally {
      setAiBusy(false);
    }
  };

  const analyzeOffline = async () => {
    if (!importPath) return;
    await analyzeOfflineWithPath(importPath);
  };

  const handleImportDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setImportDragActive(false);
    setAiError(null);
    const files = Array.from(event.dataTransfer.files ?? []);
    const pdf = files.find(
      (file) => file && (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf"))
    );
    if (!pdf) {
      setAiError("Please drop a PDF file.");
      return;
    }
    const filePath = (pdf as any).path as string | undefined;
    if (!filePath) {
      setAiError("Can't access file path from drop. Use Choose PDF instead.");
      return;
    }
    setImportPath(filePath);
    setAiResult(null);
    await analyzeOfflineWithPath(filePath);
  };

  const commitAiResult = async () => {
    if (!aiResult) return;
    for (const subj of aiResult.subjects) {
      const sid = await addSubject(subj.name);
      for (const ch of subj.chapters) {
        await addChapter(sid, ch);
      }
    }
    setAiResult(null);
    setImportPath(null);
  };

  const openResource = (resource: ChapterResource) => {
    const url = URL.createObjectURL(resource.data);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleOpenAll = () => {
    if (resourceList.length === 0) return;
    resourceList.forEach((resource) => openResource(resource));
  };

  return (
    <div className={classNames("flex h-full flex-col gap-5", { "overflow-hidden": Boolean(activeChapterId) })}>
      <TopBar
        title="Syllabus"
        placeholder="Search subjects"
        onSearchChange={setSearch}
        actionLabel="Add Subject"
        onAction={handleAddSubject}
      >
        <input
          value={subjectDraft}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setSubjectDraft(event.target.value)}
          placeholder="Quick subject name"
          className="rounded-2xl border border-surface-muted/60 bg-surface px-4 py-2 text-sm text-text outline-none focus:border-primary"
        />
      </TopBar>
      {/* Import from PDF (Offline) */}
      <div
        className={classNames(
          "relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-900/80 via-primary/20 to-slate-800/70 p-5 shadow-lg transition",
          importDragActive
            ? "border-primary/80 ring-2 ring-primary/30"
            : "border-surface-muted/60 hover:border-primary/40"
        )}
        onDragOver={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setImportDragActive(true);
        }}
        onDragLeave={() => setImportDragActive(false)}
        onDrop={handleImportDrop}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-6 top-6 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-8 bottom-6 h-24 w-24 rounded-full bg-white/15 blur-3xl" />
          {shootingTracks.map((track, index) => (
            <span
              key={index}
              className="shooting-star"
              style={{
                top: track.top,
                left: track.left,
                animationDelay: track.delay,
                animationDuration: track.duration
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:gap-6">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Time Saver Zone
            </span>
            <h4 className="mt-3 text-lg font-semibold text-white drop-shadow">Import from PDF</h4>
            <p className="text-sm text-white/80 drop-shadow-sm">
              Drag & drop a PDF on the right, or choose a file. Offline heuristic extraction of Units and Chapters.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openPdfPicker}
                className="rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Choose PDF
              </button>
              <button
                type="button"
                disabled={!importPath || aiBusy}
                onClick={analyzeOffline}
                className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiBusy ? "Analyzing..." : "Analyze (Offline)"}
              </button>
            </div>
          </div>
          <div
            className={classNames(
              "relative flex min-h-[180px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 backdrop-blur-sm transition lg:min-h-[220px]",
              importDragActive
                ? "border-white/80 bg-white/15 shadow-lg"
                : "border-white/30 hover:border-white/50",
              showPromptInstructions ? "bg-white/5" : "bg-white/5 hover:bg-white/10"
            )}
            onMouseEnter={() => setShowPromptInstructions(true)}
            onMouseLeave={() => setShowPromptInstructions(false)}
          >
            {/* Blur overlay when instructions shown */}
            {showPromptInstructions && (
              <div className="absolute inset-0 z-0 rounded-2xl backdrop-blur-md bg-black/60" />
            )}
            
            {/* Default view: UFO icon and drop zone */}
            <div className={classNames(
              "flex flex-col items-center justify-center transition-opacity duration-300",
              showPromptInstructions ? "opacity-0" : "opacity-100"
            )}>
              {/* UFO Icon */}
              <svg
                className="mb-3 h-16 w-16 text-white/70"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <ellipse cx="12" cy="12" rx="9" ry="4" opacity="0.3"/>
                <path d="M12 2c-2.2 0-4 1.8-4 4v2c-3.3.5-6 2.5-6 5 0 2.8 4 5 10 5s10-2.2 10-5c0-2.5-2.7-4.5-6-5V6c0-2.2-1.8-4-4-4zm0 2c1.1 0 2 .9 2 2v1.7c-.7-.1-1.3-.2-2-.2s-1.3.1-2 .2V6c0-1.1.9-2 2-2z"/>
                <circle cx="7" cy="13" r="1"/>
                <circle cx="12" cy="13" r="1"/>
                <circle cx="17" cy="13" r="1"/>
                <path d="M12 14c-4.4 0-8 1.3-8 3v2c0 1.7 3.6 3 8 3s8-1.3 8-3v-2c0-1.7-3.6-3-8-3z" opacity="0.2"/>
              </svg>
              <p className="text-center text-sm font-medium text-white/90">Drop PDF here</p>
              <p className="mt-1 text-center text-xs text-white/60">
                {aiBusy ? "Analyzing..." : "Hover for ChatGPT shortcut"}
              </p>
            </div>

            {/* Hover view: Instructions */}
            {showPromptInstructions && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h5 className="text-sm font-bold text-white">Quick ChatGPT Method</h5>
                </div>
                <ol className="space-y-2 text-left text-xs text-white/90 max-w-xs">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>Click "COPY THE PROMPT" below</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span>Open ChatGPT and paste the prompt</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <span>Attach your syllabus PDF to the chat</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">4.</span>
                    <span>Copy ChatGPT's response and drop it here</span>
                  </li>
                </ol>
                <button
                  onClick={copyPromptToClipboard}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-lg hover:bg-primary/90 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  COPY THE PROMPT
                </button>
              </div>
            )}
          </div>
        </div>
        {importPath && (
          <p className="relative z-10 mt-3 truncate text-[11px] uppercase tracking-[0.15em] text-white/70">
            Loaded: {importPath}
          </p>
        )}
        {aiError && <p className="relative z-10 mt-2 text-sm text-red-200">{aiError}</p>}
        {aiResult && (
          <div className="relative z-10 mt-4 rounded-2xl border border-white/30 bg-surface/90 p-3 shadow-inner">
            <p className="text-sm font-medium text-text">Preview</p>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              {aiResult.subjects.map((s, idx) => (
                <div key={idx} className="rounded-xl border border-surface-muted/50 bg-surface-elevated/80 p-3">
                  <p className="truncate text-sm font-semibold text-text">{s.name}</p>
                  <p className="text-xs text-text-muted">{s.chapters.length} chapter(s)</p>
                  <ul className="mt-2 max-h-28 space-y-1 overflow-auto pr-1 text-xs custom-scroll">
                    {s.chapters.map((c, i) => (
                      <li key={i} className="truncate text-text">• {c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={commitAiResult}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/30"
              >
                Add to Syllabus
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 pb-4 lg:grid-cols-2 xl:grid-cols-3">
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-surface-muted/60 bg-surface/80 p-12 text-center text-text-muted">
            <p className="text-lg font-medium">No subjects yet. Start by creating one above.</p>
          </div>
        ) : (
          filteredSubjects.map((subject: Subject) => {
            const chapterList = chaptersBySubject.get(subject.id ?? -1) ?? [];
            const percent = completionPercent(subject.id ?? -1);
            return (
              <article
                key={subject.id}
                className="flex flex-col gap-4 rounded-3xl border border-surface-muted/50 bg-surface-elevated/80 p-5 shadow-sm transition hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text">{subject.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      {percent}% complete
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        subject.id &&
                        setConfirmTarget({ type: "subject", id: subject.id, name: subject.name })
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 text-red-500 transition hover:border-red-400 hover:bg-red-500/10"
                      aria-label="Delete subject"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted/50">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                </div>
                <ul className="space-y-2 text-sm text-text">
                  {chapterList.map((chapter: Chapter) => (
                    <li
                      key={chapter.id}
                      className={classNames(
                        "flex items-center justify-between rounded-2xl border border-surface-muted/50 bg-surface px-3 py-2",
                        chapter.completed ? "opacity-75" : "opacity-100"
                      )}
                    >
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={chapter.completed}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            toggleChapter(chapter.id!, event.target.checked)
                          }
                          className="h-4 w-4 rounded border-surface-muted accent-primary"
                        />
                        <span className={chapter.completed ? "line-through" : undefined}>{chapter.title}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveChapterId(chapter.id!)}
                          className="rounded-full border border-surface-muted/60 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            chapter.id &&
                            setConfirmTarget({
                              type: "chapter",
                              id: chapter.id,
                              title: chapter.title,
                              subjectId: subject.id ?? -1
                            })
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 text-red-500 transition hover:border-red-400 hover:bg-red-500/10"
                          aria-label="Delete chapter"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <form
                  className="flex items-center gap-2"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    handleAddChapter(subject.id!);
                  }}
                >
                  <input
                    value={chapterDrafts[subject.id!] ?? ""}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setChapterDrafts((prev: Record<number, string>) => ({
                        ...prev,
                        [subject.id!]: event.target.value
                      }))
                    }
                    placeholder="Add chapter"
                    className="flex-1 rounded-2xl border border-surface-muted/60 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-white shadow shadow-primary/30"
                  >
                    Add
                  </button>
                </form>
              </article>
            );
          })
        )}
      </div>
      {activeChapterId && activeChapter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface/30 backdrop-blur"
          onClick={() => setActiveChapterId(null)}
        >
          <div
            className="relative flex w-full max-w-5xl flex-col gap-6 rounded-3xl border border-surface-muted/60 bg-surface-elevated/95 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-text">{activeChapter.title}</h3>
                <p className="text-sm text-text-muted">Collect your study materials and quick links here.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveChapterId(null)}
                className="rounded-full border border-surface-muted/60 px-3 py-1 text-xs font-semibold text-text-muted transition hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </header>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <section
                className={classNames(
                  "flex flex-col gap-4 rounded-2xl border border-dashed border-surface-muted/60 bg-surface/80 p-4",
                  isDragActive ? "border-primary bg-primary/5" : ""
                )}
                onDragOver={(event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={handleResourceDrop}
              >
                <div className="flex flex-col gap-2 text-center">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Resources</h4>
                  <p className="text-xs text-text-muted">
                    Drag & drop PDFs or images here, or
                    <button
                      type="button"
                      className="ml-1 text-primary underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse
                    </button>
                    .
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
                <ul className="flex flex-col gap-2 overflow-y-auto text-sm max-h-56 custom-scroll pr-1">
                  {resourceList.length === 0 ? (
                    <li className="rounded-xl border border-surface-muted/50 bg-surface px-3 py-3 text-center text-xs text-text-muted">
                      Drop study files here to keep them handy.
                    </li>
                  ) : (
                    resourceList.map((resource) => (
                      <li
                        key={resource.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-surface-muted/40 bg-surface px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">{resource.name}</p>
                          <p className="text-xs text-text-muted">
                            {resource.type.includes("pdf") ? "PDF" : "Image"} · {Math.round(resource.size / 1024)} KB
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              resource.id &&
                              setConfirmTarget({ type: "resource", id: resource.id, name: resource.name })
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 text-red-500 transition hover:border-red-400 hover:bg-red-500/10"
                            aria-label="Delete resource"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openResource(resource)}
                            className="rounded-full border border-surface-muted/60 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                          >
                            Open
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </section>
              <section className="flex flex-col gap-4 rounded-2xl border border-surface-muted/60 bg-surface/80 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Links</h4>
                </div>
                <form className="flex flex-col gap-3" onSubmit={handleAddLink}>
                  <input
                    value={linkLabel}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setLinkLabel(event.target.value)}
                    placeholder="Label (optional)"
                    className="rounded-2xl border border-surface-muted/60 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={linkUrl}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setLinkUrl(event.target.value)}
                    placeholder="https://"
                    type="url"
                    required
                    className="rounded-2xl border border-surface-muted/60 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="self-start rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow shadow-primary/30"
                  >
                    Save Link
                  </button>
                </form>
                <ul className="flex flex-col gap-2 overflow-y-auto text-sm max-h-56 custom-scroll pr-1">
                  {linkList.length === 0 ? (
                    <li className="rounded-xl border border-surface-muted/50 bg-surface px-3 py-3 text-center text-xs text-text-muted">
                      Add YouTube videos, websites or docs to revisit quickly.
                    </li>
                  ) : (
                    linkList.map((link) => (
                      <li
                        key={link.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-surface-muted/40 bg-surface px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">{link.label}</p>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            {link.url}
                          </a>
                        </div>
                        <span className="text-xs text-text-muted">Saved</span>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>
            <button
              type="button"
              onClick={handleOpenAll}
              disabled={resourceList.length === 0}
              className="ml-auto rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow shadow-primary/40 transition hover:shadow-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open All
            </button>
          </div>
        </div>
      )}
      {confirmTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-surface/40 backdrop-blur-sm"
          onClick={() => setConfirmTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-surface-muted/60 bg-surface-elevated/95 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              ARE YOU SURE YOU WANT TO DELETE?
            </p>
            <p className="mt-2 text-sm font-medium text-text">
              {confirmTarget.type === "subject" && `Subject: ${confirmTarget.name}`}
              {confirmTarget.type === "chapter" && `Chapter: ${confirmTarget.title}`}
              {confirmTarget.type === "resource" && `Resource: ${confirmTarget.name}`}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="rounded-full border border-surface-muted/60 px-4 py-2 text-xs font-semibold text-text-muted transition hover:border-primary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white shadow shadow-red-500/40 transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyllabusSection;
