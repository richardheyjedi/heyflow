"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCheck, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import type { NotificationWithTask } from "@/lib/types";

const TYPE_ICON = {
  due_soon: Clock,
  overdue: AlertTriangle,
  completed: CheckCircle2,
} as const;

const TYPE_COLOR = {
  due_soon: "text-priority-medium bg-priority-medium/15",
  overdue: "text-priority-urgent bg-priority-urgent/15",
  completed: "text-primary bg-primary/15",
} as const;

export function NotificationsDropdown({ notifications }: { notifications: NotificationWithTask[] }) {
  const [items, setItems] = useState(notifications);
  const [, startTransition] = useTransition();
  const unreadCount = items.filter((n) => !n.read).length;

  function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    startTransition(() => {
      markNotificationRead(id);
    });
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(() => {
      markAllNotificationsRead();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="relative flex size-9 items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground" />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-gradient-violet text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notificações</p>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma notificação por aqui.</p>
          ) : (
            items.map((notification) => {
              const Icon = TYPE_ICON[notification.type];
              return (
                <button
                  key={notification.id}
                  onClick={() => handleMarkRead(notification.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-accent/50 last:border-b-0",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", TYPE_COLOR[notification.type])}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex-1 space-y-0.5">
                    <span className={cn("block text-xs text-foreground", !notification.read && "font-medium")}>
                      {notification.message}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ptBR })}
                    </span>
                  </span>
                  {!notification.read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
