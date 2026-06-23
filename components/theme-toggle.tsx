"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/**
 * Light/dark switch. Persists the choice in localStorage and reflects it on
 * <html data-theme>. Defaults to the system preference until the user picks.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Resolve the current theme on mount (explicit choice, else system).
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) ?? null;
    if (saved) {
      setTheme(saved);
    } else {
      setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore storage errors */
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-line text-ink-soft hover:text-ink hover:bg-muted cursor-pointer transition-colors"
    >
      {/* Render a stable icon until mounted to avoid hydration mismatch. */}
      {theme === null ? (
        <Sun size={17} aria-hidden />
      ) : isDark ? (
        <Sun size={17} aria-hidden />
      ) : (
        <Moon size={17} aria-hidden />
      )}
    </button>
  );
}
