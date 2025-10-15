import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans]
      },
      colors: {
        surface: "var(--color-surface)",
        surfaceMuted: "var(--color-surface-muted)",
        surfaceElevated: "var(--color-surface-elevated)",
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        text: "var(--color-text)",
        textMuted: "var(--color-text-muted)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)"
      },
      boxShadow: {
        subtle: "0 12px 30px -20px rgba(0, 0, 0, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
