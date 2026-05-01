"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
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
  return <button className="themeBtn" onClick={toggle}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>;
}
