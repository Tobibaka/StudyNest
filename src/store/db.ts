import Dexie, { Table } from "dexie";

export type ThemeMode = "light" | "dark";

export interface Subject {
  id?: number;
  name: string;
  createdAt: string;
}

export interface Chapter {
  id?: number;
  subjectId: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface ChapterResource {
  id?: number;
  chapterId: number;
  name: string;
  type: string;
  size: number;
  data: Blob;
  createdAt: string;
}

export interface ChapterLink {
  id?: number;
  chapterId: number;
  label: string;
  url: string;
  createdAt: string;
}

export type TaskCategory = "Study" | "Assignment" | "Exam";
export type TaskPriority = "Low" | "Medium" | "High";

export interface Task {
  id?: number;
  date: string; // ISO Date (yyyy-mm-dd)
  title: string;
  category: TaskCategory;
  dueTime?: string;
  priority: TaskPriority;
  completed: boolean;
  createdAt: string;
}

export interface FocusLog {
  id?: number;
  date: string; // ISO Date
  focusedMinutes: number;
  updatedAt: string;
}

export interface Credential {
  username: string;
  passwordHash: string;
  createdAt: string;
}

class StudyNestDB extends Dexie {
  subjects!: Table<Subject, number>;
  chapters!: Table<Chapter, number>;
  tasks!: Table<Task, number>;
  focusLogs!: Table<FocusLog, number>;
  credentials!: Table<Credential, string>;
  chapterResources!: Table<ChapterResource, number>;
  chapterLinks!: Table<ChapterLink, number>;

  constructor() {
    super("StudyNestDB");
    this.version(1).stores({
      subjects: "++id, name, createdAt",
      chapters: "++id, subjectId, completed",
      tasks: "++id, date, category, priority, completed",
      focusLogs: "++id, date",
      credentials: "&username"
    });
    this.version(2).stores({
      subjects: "++id, name, createdAt",
      chapters: "++id, subjectId, completed",
      tasks: "++id, date, category, priority, completed",
      focusLogs: "++id, date",
      credentials: "&username",
      chapterResources: "++id, chapterId, createdAt",
      chapterLinks: "++id, chapterId, createdAt"
    });
  }
}

export const db = new StudyNestDB();
