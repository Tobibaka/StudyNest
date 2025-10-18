import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StateCreator } from "zustand";
import type { ThemeMode } from "@store/db";

interface SettingsState {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const settingsCreator: StateCreator<SettingsState, [], [], SettingsState> = (
  set,
  get
) => ({
  theme: "light",
  setTheme: (mode: ThemeMode) => {
    set({ theme: mode });
  },
  toggleTheme: () => {
    set({ theme: get().theme === "light" ? "dark" : "light" });
  }
});

export const useSettingsStore = create<SettingsState>()(
  persist(settingsCreator, {
    name: "studynest-settings"
  })
);
