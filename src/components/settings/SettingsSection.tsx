import TopBar from "@components/TopBar";
import { useSettingsStore } from "@store/settingsStore";
import { useAuthStore } from "@store/authStore";

const SettingsSection = () => {
  const { theme, toggleTheme } = useSettingsStore();
  const { logout, user } = useAuthStore();

  return (
    <div className="flex h-full flex-col gap-5">
      <TopBar title="Settings" />
      <section className="grid gap-6 rounded-3xl border border-surface-muted/50 bg-surface-elevated/80 p-6 shadow-sm md:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold text-text">Appearance</h3>
          <p className="mt-2 text-sm text-text-muted">
            Switch between light and dark mode for different lighting conditions.
          </p>
          <button
            onClick={toggleTheme}
            className="mt-4 rounded-2xl border border-surface-muted/60 bg-surface px-4 py-3 text-sm font-semibold text-text transition hover:border-primary hover:text-primary"
          >
            Toggle to {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text">Account</h3>
          <p className="mt-2 text-sm text-text-muted">Signed in as {user?.username}</p>
          <button
            onClick={logout}
            className="mt-4 rounded-2xl border border-red-400/40 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-400/10"
          >
            Log Out
          </button>
          <div className="mt-8 rounded-2xl border border-surface-muted/60 bg-surface px-4 py-3 text-sm text-text-muted">
            StudyNest v1 — Lightweight Non-AI Desktop App
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsSection;
