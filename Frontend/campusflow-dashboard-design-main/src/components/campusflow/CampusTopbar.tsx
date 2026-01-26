import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationsDropdown, type CampusNotification } from "@/components/campusflow/NotificationsDropdown";
import { UserMenu } from "@/components/campusflow/UserMenu";

export function CampusTopbar({
  title,
  notifications,
  user,
}: {
  title: string;
  notifications: CampusNotification[];
  user: { name: string; role: string };
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="flex h-14 items-center gap-3 px-4">
        {/* CRITICAL: single global trigger, always visible */}
        <SidebarTrigger className="shrink-0" />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-1">
          <NotificationsDropdown notifications={notifications} />
          <UserMenu name={user.name} role={user.role} />
        </div>
      </div>
    </header>
  );
}
