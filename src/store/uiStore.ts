import { create } from "zustand";
import type { StateCreator } from "zustand";

export type DashboardSection = "syllabus" | "tasks" | "clock" | "settings";

interface UIState {
  section: DashboardSection;
  sidebarCollapsed: boolean;
  focusMode: boolean;
  setSection: (section: DashboardSection) => void;
  toggleSidebar: () => void;
  setFocusMode: (active: boolean) => void;
}

const uiCreator: StateCreator<UIState, [], [], UIState> = (set) => ({
  section: "syllabus",
  sidebarCollapsed: false,
  focusMode: false,
  setSection: (section: DashboardSection) => set({ section }),
  toggleSidebar: () =>
    set((state: UIState) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setFocusMode: (active: boolean) => set({ focusMode: active })
});

export const useUIStore = create<UIState>(uiCreator);
