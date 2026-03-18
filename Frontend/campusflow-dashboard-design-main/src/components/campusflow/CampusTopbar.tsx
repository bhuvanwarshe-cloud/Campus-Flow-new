import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationsDropdown, type CampusNotification } from "@/components/campusflow/NotificationsDropdown";
import { UserMenu } from "@/components/campusflow/UserMenu";
import { COLLEGE_NAME } from "@/constants/college";

export function CampusTopbar({
  title,
  user,
}: {
  title: string;
  user: { name: string; role: string };
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="flex h-14 items-center gap-3 px-4">
        {/* CRITICAL: single global trigger, always visible */}
        <SidebarTrigger className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col">
            <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
            <p className="text-xs text-muted-foreground truncate">{COLLEGE_NAME}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <NotificationsDropdown />
          <UserMenu name={user.name} role={user.role} />
        </div>
      </div>
    </header>
  );
}
