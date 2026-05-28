"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "dashboardTheme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.dashboardTheme = theme;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

function getServerTheme(): Theme {
  return "light";
}

function subscribeToThemeChange(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("dashboard-theme-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("dashboard-theme-change", callback);
  };
}

export function ThemeSync() {
  const theme = useSyncExternalStore(
    subscribeToThemeChange,
    getStoredTheme,
    getServerTheme,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return null;
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToThemeChange,
    getStoredTheme,
    getServerTheme,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function updateTheme(nextTheme: Theme) {
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("dashboard-theme-change"));
  }

  return (
    <div className="flex h-10 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-muted)] p-1">
      {(["light", "dark"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => updateTheme(item)}
          className={`rounded-md px-3 text-sm font-medium transition ${
            theme === item
              ? "bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-sm"
              : "text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]"
          }`}
        >
          {item === "light" ? "สว่าง" : "เข้ม"}
        </button>
      ))}
    </div>
  );
}
