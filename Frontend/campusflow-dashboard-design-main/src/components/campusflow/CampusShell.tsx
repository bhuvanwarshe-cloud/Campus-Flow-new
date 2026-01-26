import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { CampusSidebar, type CampusRole } from "@/components/campusflow/CampusSidebar";
import { CampusTopbar } from "@/components/campusflow/CampusTopbar";
import type { CampusNotification } from "@/components/campusflow/NotificationsDropdown";

export function CampusShell({
  role,
  title,
  notifications,
  user,
  children,
}: {
  role: CampusRole;
  title: string;
  notifications: CampusNotification[];
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <CampusSidebar role={role} />
        <SidebarInset>
          <CampusTopbar title={title} notifications={notifications} user={user} />
          <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
