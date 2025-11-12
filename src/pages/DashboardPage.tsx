import Sidebar from "@components/Sidebar";
import SyllabusSection from "@components/syllabus/SyllabusSection";
import TasksSection from "@components/tasks/TasksSection";
import ClockSection from "@components/clock/ClockSection";
import SettingsSection from "@components/settings/SettingsSection";
import EscapeSection from "@components/escape/EscapeSection";
import { useUIStore } from "@store/uiStore";

const DashboardPage = () => {
  const { section, focusMode } = useUIStore();

  const renderSection = () => {
    switch (section) {
      case "tasks":
        return <TasksSection />;
      case "clock":
        return <ClockSection />;
      case "escape":
        return <EscapeSection />;
      case "settings":
        return <SettingsSection />;
      case "syllabus":
      default:
        return <SyllabusSection />;
    }
  };

  return (
    <div className="relative h-screen bg-surface">
      {focusMode && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-black/40 backdrop-blur-sm transition" />
      )}
      <div className="grid h-full grid-cols-[auto_1fr] overflow-hidden">
        <Sidebar />
        <main className="relative flex h-full flex-col overflow-hidden px-6 py-6">
          <div className="custom-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="relative z-10 mx-auto max-w-6xl pb-10">{renderSection()}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
