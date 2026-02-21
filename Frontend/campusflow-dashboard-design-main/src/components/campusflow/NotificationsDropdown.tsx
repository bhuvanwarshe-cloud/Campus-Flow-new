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
          <Bell className="h-[1.2rem] w-[1.2rem]" />
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

      <DropdownMenuContent align="end" className="w-[360px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex flex-col">
            <span>Notifications</span>
            <span className="text-[10px] font-normal text-muted-foreground">{unreadCount} unread</span>
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

        <div className="max-h-[360px] overflow-auto p-1">
          {loading && notifications.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">You're all caught up.</div>
          ) : (
            <div className="grid gap-1">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n.id, n.is_read, n.link)}
                  className={cn(
                    "cursor-pointer rounded-lg border border-transparent p-3 transition-all hover:bg-accent",
                    !n.is_read ? "bg-brand2/5 border-brand2/10 shadow-sm" : "opacity-75"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-brand2 shrink-0" />}
                        <p className={cn("truncate text-sm font-medium", !n.is_read && "text-brand2")}>
                          {n.title}
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
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
