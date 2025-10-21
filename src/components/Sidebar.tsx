import { useMemo, type ComponentType, type SVGProps } from "react";
import {
  BookOpenIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ClockIcon,
  Squares2X2Icon
} from "@heroicons/react/24/outline";
import classNames from "classnames";
import { useUIStore, type DashboardSection } from "@store/uiStore";

const sidebarItems: Array<{
  id: DashboardSection;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  {
    id: "syllabus",
    label: "Syllabus",
    icon: BookOpenIcon
  },
  {
    id: "tasks",
    label: "To-Do + Calendar",
    icon: CalendarDaysIcon
  },
  {
    id: "clock",
    label: "Clock Canvas",
    icon: ClockIcon
  }
];

const Sidebar = () => {
  const { section, setSection, sidebarCollapsed, toggleSidebar } = useUIStore();

  const settingsIcon = useMemo(
    () => (
      <button
        onClick={() => setSection("settings")}
        className={classNames(
          "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
          section === "settings"
            ? "bg-primary/15 text-primary"
            : "text-text-muted hover:bg-surface-muted/40 hover:text-primary"
        )}
      >
        <Cog6ToothIcon className="h-6 w-6" />
        {!sidebarCollapsed && <span>Settings</span>}
      </button>
    ),
    [section, setSection, sidebarCollapsed]
  );

  return (
    <aside
      className={classNames(
        "relative flex h-full flex-col border-r border-surface-muted/50 bg-surface-elevated/80 backdrop-blur transition-all duration-300 ease-smooth",
        sidebarCollapsed ? "w-[78px]" : "w-72"
      )}
    >
      <div className="flex items-center justify-between px-4 pb-6 pt-6">
        <div className="flex items-center gap-3">
          <Squares2X2Icon className="h-8 w-8 text-primary" />
          {!sidebarCollapsed && (
            <div>
              <p className="text-base font-semibold">StudyNest</p>
              <p className="text-xs text-text-muted">v1 Lightweight</p>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="rounded-full border border-surface-muted/60 bg-surface px-3 py-1 text-xs font-medium text-text-muted transition hover:text-primary"
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>
      </div>
      <nav className="flex-1 space-y-2 px-3">
        {sidebarItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={classNames(
              "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
              section === id
                ? "bg-primary/15 text-primary shadow-subtle"
                : "text-text-muted hover:bg-surface-muted/40 hover:text-primary"
            )}
          >
            <Icon className="h-6 w-6" />
            {!sidebarCollapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>
      <div className="px-3 pb-6">{settingsIcon}</div>
    </aside>
  );
};

export default Sidebar;
