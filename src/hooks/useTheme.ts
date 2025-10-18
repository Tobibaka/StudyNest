import { useEffect } from "react";
import { useSettingsStore } from "@store/settingsStore";

export const useTheme = () => {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme]);
};
