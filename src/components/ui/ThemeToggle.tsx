"use client";

import { useEffect, useState } from "react";

type Props = {
  variant?: "text" | "icon";
};

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle({ variant = "text" }: Props) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("hive_theme") as "light" | "dark" | null) ?? "dark";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("hive_theme", next);
    document.documentElement.dataset.theme = next;
  };

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  if (variant === "icon") {
    return (
      <button type="button" className="themeToggleIcon" onClick={toggle} aria-label={label} title={label}>
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  return (
    <button type="button" className="themeBtn" onClick={toggle} aria-label={label}>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
