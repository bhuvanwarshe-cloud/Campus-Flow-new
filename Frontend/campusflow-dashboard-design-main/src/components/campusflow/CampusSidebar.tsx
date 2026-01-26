import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarCheck,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";

import { NavLink } from "@/components/NavLink";
import { CampusLogo } from "@/components/campusflow/CampusLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type CampusRole = "admin" | "teacher" | "student";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const adminItems: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Courses", url: "/admin/courses", icon: BookOpen },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "AI Insights", url: "/admin/ai-insights", icon: Brain },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

const teacherItems: NavItem[] = [
  { title: "Dashboard", url: "/teacher", icon: LayoutDashboard },
  { title: "My Classes", url: "/teacher/classes", icon: GraduationCap },
  { title: "Attendance", url: "/teacher/attendance", icon: CalendarCheck },
  { title: "Marks", url: "/teacher/marks", icon: Gauge },
  { title: "Notifications", url: "/teacher/notifications", icon: BarChart3 },
];

const studentItems: NavItem[] = [
  { title: "Dashboard", url: "/student", icon: LayoutDashboard },
  { title: "My Courses", url: "/student/courses", icon: BookOpen },
  { title: "Marks", url: "/student/marks", icon: Gauge },
  { title: "Attendance", url: "/student/attendance", icon: CalendarCheck },
  { title: "Notifications", url: "/student/notifications", icon: BarChart3 },
  { title: "AI Coach", url: "/student/ai-coach", icon: Brain },
];

export function CampusSidebar({ role }: { role: CampusRole }) {
  const location = useLocation();
  const items = useMemo(() => {
    if (role === "teacher") return teacherItems;
    if (role === "student") return studentItems;
    return adminItems;
  }, [role]);

  const currentPath = location.pathname;

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <div className="border-b px-3 py-3">
        <CampusLogo className="justify-start" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => {
              const isActive = currentPath === item.url;
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className=""
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
