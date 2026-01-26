import { Bell } from "lucide-react";

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
  description: string;
  timestamp: string;
  unread?: boolean;
};

export function NotificationsDropdown({ notifications }: { notifications: CampusNotification[] }) {
  const unreadCount = notifications.filter((n) => n.unread).length;

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
                  className={cn(
                    "rounded-lg border bg-card p-3 shadow-soft",
                    n.unread && "border-brand2/30 bg-brand2/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.description}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{n.timestamp}</span>
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
