"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    () => () => {},
    () => document.documentElement.classList.contains("dark"),
    () => false
  );

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("hey-theme", next ? "dark" : "light");
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? "Usar tema claro" : "Usar tema escuro"} title={dark ? "Tema claro" : "Tema escuro"}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
