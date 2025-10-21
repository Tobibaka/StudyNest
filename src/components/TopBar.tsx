import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import classNames from "classnames";
import type { PropsWithChildren, ChangeEvent } from "react";

interface TopBarProps {
  title: string;
  placeholder?: string;
  onSearchChange?: (value: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  classy?: string;
}

const TopBar = ({
  title,
  placeholder = "Search...",
  onSearchChange,
  actionLabel,
  onAction,
  classy,
  children
}: PropsWithChildren<TopBarProps>) => {
  return (
    <header
      className={classNames(
        "flex flex-col gap-4 rounded-2xl border border-surface-muted/40 bg-surface-elevated/60 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between",
        classy
      )}
    >
      <div>
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="text-sm text-text-muted">Stay organised with quick actions & focus tools.</p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        {onSearchChange && (
          <label className="flex items-center gap-2 rounded-full border border-surface-muted/60 bg-surface px-3 py-2 text-sm text-text-muted focus-within:border-primary focus-within:text-primary">
            <MagnifyingGlassIcon className="h-5 w-5" />
            <input
              type="search"
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-text outline-none"
              onChange={(event: ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value)}
            />
          </label>
        )}
        {actionLabel && (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:shadow-primary/50"
          >
            <PlusIcon className="h-5 w-5" />
            <span>{actionLabel}</span>
          </button>
        )}
        {children}
      </div>
    </header>
  );
};

export default TopBar;
