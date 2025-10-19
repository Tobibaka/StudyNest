import { db } from "@store/db";

export const addSubject = async (name: string): Promise<number> => {
  const trimmed = name.trim();
  if (!trimmed) return Promise.reject(new Error("Subject name is empty"));
  const id = await db.subjects.add({
    name: trimmed,
    createdAt: new Date().toISOString()
  });
  return id;
};

export const deleteSubject = async (subjectId: number) => {
  const relatedChapters = await db.chapters.where({ subjectId }).toArray();
  const chapterIds = relatedChapters.map((chapter) => chapter.id!).filter(Boolean);
  if (chapterIds.length > 0) {
    await db.chapterResources.where("chapterId").anyOf(chapterIds).delete();
    await db.chapterLinks.where("chapterId").anyOf(chapterIds).delete();
  }
  await db.chapters.where({ subjectId }).delete();
  await db.subjects.delete(subjectId);
};

export const addChapter = async (subjectId: number, title: string): Promise<number> => {
  const trimmed = title.trim();
  if (!trimmed) return Promise.reject(new Error("Chapter title is empty"));
  const id = await db.chapters.add({
    subjectId,
    title: trimmed,
    completed: false,
    createdAt: new Date().toISOString()
  });
  return id;
};

export const toggleChapter = async (chapterId: number, completed: boolean) => {
  await db.chapters.update(chapterId, { completed });
};

export const deleteChapter = async (chapterId: number) => {
  await db.chapterResources.where({ chapterId }).delete();
  await db.chapterLinks.where({ chapterId }).delete();
  await db.chapters.delete(chapterId);
};

export const deleteChapterResource = async (resourceId: number) => {
  await db.chapterResources.delete(resourceId);
};

export const addChapterResource = async (chapterId: number, file: File) => {
  if (!file) return;
  const allowed = file.type === "application/pdf" || file.type.startsWith("image/");
  if (!allowed) return;
  const blob = file.slice(0, file.size, file.type);
  await db.chapterResources.add({
    chapterId,
    name: file.name,
    type: file.type,
    size: file.size,
    data: blob,
    createdAt: new Date().toISOString()
  });
};

export const addChapterLink = async (chapterId: number, label: string, url: string) => {
  const trimmedLabel = label.trim();
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return;
  await db.chapterLinks.add({
    chapterId,
    label: trimmedLabel || trimmedUrl,
    url: trimmedUrl,
    createdAt: new Date().toISOString()
  });
};
