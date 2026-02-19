import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type CampusNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type?: 'info' | 'warning' | 'success' | 'error';
  link?: string;
};

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<CampusNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/api/notifications");
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.data.filter((n: any) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time listener
  useRealtime({
    table: "notifications",
    event: "*", // Listen for INSERT (new) and UPDATE (read status)
    callback: () => {
      fetchNotifications();
    },
  });

  const markAsRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // Already read

    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      await api.patch(`/api/notifications/${id}/read`);
    } catch (error) {
      console.error("Failed to mark as read:", error);
      fetchNotifications(); // Revert on error
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell />
          <span className="sr-only">Open notifications</span>
          {unreadCount > 0 && (
            <span
              className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand2 px-1 text-[10px] font-semibold text-brand2-foreground"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <span className="text-xs font-normal text-muted-foreground">{unreadCount} unread</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[360px] overflow-auto p-1">
          {notifications.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">You're all caught up.</div>
          ) : (
            <div className="grid gap-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id, n.is_read)}
                  className={cn(
                    "cursor-pointer rounded-lg border bg-card p-3 shadow-soft transition-colors hover:bg-accent",
                    !n.is_read && "border-brand2/30 bg-brand2/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn("truncate text-sm font-medium", !n.is_read && "font-semibold")}>{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
