import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CampusShell } from "@/components/campusflow/CampusShell";
import { StatCard } from "@/components/campusflow/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const attendanceTrend = [
  { week: "W1", attendance: 91 },
  { week: "W2", attendance: 89 },
  { week: "W3", attendance: 93 },
  { week: "W4", attendance: 90 },
  { week: "W5", attendance: 92 },
  { week: "W6", attendance: 94 },
];

const deptPerformance = [
  { dept: "Engineering", score: 84 },
  { dept: "Business", score: 79 },
  { dept: "Arts", score: 76 },
  { dept: "Science", score: 82 },
];

const notifications = [
  {
    id: "n1",
    title: "AI flagged 6 at-risk students",
    description: "Attendance decline detected across two cohorts.",
    timestamp: "2h",
    unread: true,
  },
  {
    id: "n2",
    title: "New course created",
    description: "CS-214: Data Structures has been added.",
    timestamp: "1d",
  },
  {
    id: "n3",
    title: "Teacher onboarding pending",
    description: "3 teacher accounts require approval.",
    timestamp: "2d",
    unread: true,
  },
];

export default function AdminDashboard() {
  const { profile } = useAuth();

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : profile?.email?.split('@')[0] || 'Admin';

  return (
    <CampusShell
      role="admin"
      title={`Welcome back, ${profile?.firstName || 'Admin'} 👋`}
      notifications={notifications}
      user={{ name: displayName, role: "Admin" }}
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Students" value="12,480" hint="+2.1% this term" />
          <StatCard label="Total Teachers" value="640" hint="Across 18 departments" />
          <StatCard label="Active Courses" value="1,120" hint="Current semester" tone="brand2" />
          <StatCard label="At-Risk Students (AI)" value="86" hint="Needs attention" tone="ai" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Attendance trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <div className="h-full w-full text-primary">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[85, 96]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                      }}
                    />
                    <Line type="monotone" dataKey="attendance" stroke="currentColor" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Insight title="Attendance risk" tone="ai">
                Engineering Year 1 shows a 3-week downward trend.
              </Insight>
              <Insight title="Course engagement" tone="brand2">
                Business electives show high satisfaction but lower attendance.
              </Insight>
              <Insight title="Recommended action" tone="default">
                Prioritize advisor outreach for students below 80% attendance.
              </Insight>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Department performance</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <div className="h-full w-full text-brand2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptPerformance} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dept" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[70, 90]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                      }}
                    />
                    <Bar dataKey="score" fill="currentColor" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </CampusShell>
  );
}

function Insight({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone: "default" | "brand2" | "ai";
}) {
  const pillClass =
    tone === "ai"
      ? "bg-ai/10 text-ai"
      : tone === "brand2"
        ? "bg-brand2/10 text-brand2"
        : "bg-secondary text-secondary-foreground";
  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${pillClass}`}>AI</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
