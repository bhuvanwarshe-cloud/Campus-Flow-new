import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { CampusSidebar, type CampusRole } from "@/components/campusflow/CampusSidebar";
import { CampusTopbar } from "@/components/campusflow/CampusTopbar";

export function CampusShell({
  role,
  title,
  user,
  children,
}: {
  role: CampusRole;
  title: string;
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <CampusSidebar role={role} />
        <SidebarInset>
          <CampusTopbar title={title} user={user} />
          <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
