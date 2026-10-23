"use client";

import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";

export const THEME_STORAGE_KEY = "theme";

/** Inline script (runs before paint) that applies the saved or system theme — avoids a flash of the wrong theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var d=document.documentElement;d.classList.toggle('dark',t==='dark');d.dataset.theme=t}catch(e){}})();`;

export function ThemeSwitch() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore: theme still applies for this page view.
    }
  };

  return (
    <Button variant="ghost" size="sm" isIconOnly aria-label="Toggle dark mode" onPress={toggle}>
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
    </Button>
  );
}
