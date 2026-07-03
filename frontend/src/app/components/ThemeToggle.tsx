import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ theme, onToggle, className = "", showLabel = false }: ThemeToggleProps) {
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 ${showLabel ? "" : "w-9"} ${className}`}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {showLabel && <span className="hidden text-xs font-semibold sm:inline">{dark ? "Light" : "Dark"}</span>}
    </button>
  );
}
