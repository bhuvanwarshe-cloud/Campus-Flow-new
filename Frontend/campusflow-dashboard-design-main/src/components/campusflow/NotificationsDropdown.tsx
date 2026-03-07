import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CampusNotification } from "@/contexts/NotificationContext";

// Re-export for CampusTopbar import compatibility
export type { CampusNotification };

// ─── Type icon mapping ─────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: string; color: string }> = {
  assignment: { icon: "📝", color: "text-blue-600 dark:text-blue-400" },
  test: { icon: "🧪", color: "text-purple-600 dark:text-purple-400" },
  announcement: { icon: "📢", color: "text-amber-600 dark:text-amber-400" },
  marks: { icon: "📊", color: "text-green-600 dark:text-green-400" },
  attendance: { icon: "📋", color: "text-rose-600 dark:text-rose-400" },
  performance: { icon: "🏆", color: "text-yellow-600 dark:text-yellow-400" },
  info: { icon: "ℹ️", color: "text-muted-foreground" },
  warning: { icon: "⚠️", color: "text-yellow-600 dark:text-yellow-400" },
  success: { icon: "✅", color: "text-green-600 dark:text-green-400" },
  error: { icon: "❌", color: "text-red-600 dark:text-red-400" },
};

function getTypeMeta(type?: string) {
  return TYPE_META[type ?? "info"] ?? TYPE_META.info;
}

// ─── Component ─────────────────────────────────────────────────────────────
export function NotificationsDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const navigate = useNavigate();

  const handleNotifClick = (id: string, isRead: boolean, link?: string) => {
    if (!isRead) markAsRead(id);
    if (link) navigate(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={cn("h-[1.2rem] w-[1.2rem] transition-colors", unreadCount > 0 && "text-brand2")} />
          <span className="sr-only">Open notifications</span>
          {unreadCount > 0 && (
            <span
              className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand2 px-1 text-[10px] font-semibold text-brand2-foreground animate-in zoom-in"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px]">
        <DropdownMenuLabel className="flex items-center justify-between py-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Notifications</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </span>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-brand2 hover:text-brand2 hover:bg-brand2/10"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              <CheckCheck className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[400px] overflow-auto p-1">
          {loading && notifications.length === 0 ? (
            <div className="px-2 py-10 text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-brand2 border-t-transparent" />
              <p className="text-xs text-muted-foreground">Loading notifications…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-2 py-10 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">You're all caught up!</p>
              <p className="text-xs text-muted-foreground/60">New notifications will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-0.5">
              {notifications.map((n) => {
                const meta = getTypeMeta(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n.id, n.is_read, n.link)}
                    className={cn(
                      "cursor-pointer rounded-lg border border-transparent p-3 transition-all hover:bg-accent group",
                      !n.is_read
                        ? "bg-brand2/5 border-brand2/10"
                        : "opacity-70 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type icon */}
                      <span className="mt-0.5 shrink-0 text-base leading-none select-none">{meta.icon}</span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!n.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand2 shrink-0" />
                          )}
                          <p className={cn(
                            "truncate text-sm font-medium",
                            !n.is_read && "text-brand2"
                          )}>
                            {n.title}
                          </p>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {n.message}
                        </p>
                      </div>

                      {/* Timestamp */}
                      <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-1">
              <p className="px-2 py-1 text-[10px] text-center text-muted-foreground">
                Showing last {notifications.length} notifications
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
