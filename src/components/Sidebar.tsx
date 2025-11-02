import { useMemo, useState, useRef, useEffect, type ComponentType, type SVGProps } from "react";
import {
  BookOpenIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ClockIcon,
  PuzzlePieceIcon
} from "@heroicons/react/24/outline";
import classNames from "classnames";
import { useUIStore, type DashboardSection } from "@store/uiStore";
import birdIcon from "../../build/icons/icon.png";

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
  },
  {
    id: "escape",
    label: "Escape",
    icon: PuzzlePieceIcon
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-6 pt-6 relative">
        <div className="flex items-center gap-3">
          <img src={birdIcon} alt="StudyNest" className="h-8 w-8 object-contain" />
          {!sidebarCollapsed && (
            <div>
              <p className="text-base font-semibold">StudyNest</p>
              <p className="text-xs text-text-muted">v1 Lightweight</p>
            </div>
          )}
        </div>

        {/* Visual placeholder to keep layout when toggle is moved to the partition */}
        <div style={{ width: 44 }} />

        {/* Partition-line positioned collapse toggle */}
        {/* absolutely positioned relative to the aside (parent has relative) */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2"
          style={{ pointerEvents: "none" }}
        >
          {/* Button container sits half outside the sidebar border */}
          <div
            style={{ transform: "translateX(50%)" }}
            className="pointer-events-auto"
          >
            {/* We'll manage a short press animation and transient icon */}
            {/* Use JS handlers to coordinate animation and toggle */}
            <CollapseToggleButton
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
            />
          </div>
        </div>
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

// Small toggle button placed on the partition line.
function CollapseToggleButton({
  sidebarCollapsed,
  toggleSidebar
}: {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handlePointerDown = () => {
    // show transient icon and start short animation, then toggle
    setIsPressed(true);
    // after animation, toggle and clear pressed state
    timeoutRef.current = window.setTimeout(() => {
      toggleSidebar();
      setIsPressed(false);
      timeoutRef.current = null;
    }, 260);
  };

  const handlePointerUp = () => {
    // if the user releases early, let the timeout complete or clear it
    if (timeoutRef.current) {
      // keep letting the pending toggle happen; do not prematurely clear
    }
  };

  return (
    <button
      aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsPressed(false);
      }}
      className={"flex h-10 w-10 items-center justify-center rounded-full border bg-surface text-sm font-medium text-text-muted shadow transition-transform"}
      style={{
        transform: isPressed ? "translateY(2px) scale(0.96)" : "translateY(0)",
        transition: "transform 260ms",
        transitionTimingFunction: "cubic-bezier(.2,-0.4,.2,1.4)",
        pointerEvents: "auto"
      }}
    >
      {isPressed ? "<>" : sidebarCollapsed ? "›" : "‹"}
    </button>
  );
}

export default Sidebar;
