import { db } from "@store/db";

export const logFocusedMinutes = async (date: string, minutes: number) => {
  const existing = await db.focusLogs.where({ date }).first();
  if (existing?.id) {
    await db.focusLogs.update(existing.id, {
      focusedMinutes: existing.focusedMinutes + minutes,
      updatedAt: new Date().toISOString()
    });
  } else {
    await db.focusLogs.add({
      date,
      focusedMinutes: minutes,
      updatedAt: new Date().toISOString()
    });
  }
};
