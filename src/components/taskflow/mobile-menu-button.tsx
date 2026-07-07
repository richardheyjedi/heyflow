"use client";

import { Menu } from "lucide-react";
import { useUiStore } from "@/store/ui-store";

/** Botão hamburger da topbar — abre o drawer da sidebar. Só aparece no mobile. */
export function MobileMenuButton() {
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);

  return (
    <button
      type="button"
      aria-label="Abrir menu"
      onClick={toggleMobileSidebar}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:hidden"
    >
      <Menu className="size-4" />
    </button>
  );
}
