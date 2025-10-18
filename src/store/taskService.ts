import { db, type Task, type TaskCategory, type TaskPriority } from "@store/db";

export const addTask = async ({
  date,
  title,
  category,
  dueTime,
  priority
}: {
  date: string;
  title: string;
  category: TaskCategory;
  dueTime?: string;
  priority: TaskPriority;
}) => {
  if (!title.trim()) return;
  await db.tasks.add({
    date,
    title: title.trim(),
    category,
    dueTime,
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  });
};

export const updateTask = async (taskId: number, updates: Partial<Task>) => {
  await db.tasks.update(taskId, updates);
};

export const deleteTask = async (taskId: number) => {
  await db.tasks.delete(taskId);
};
