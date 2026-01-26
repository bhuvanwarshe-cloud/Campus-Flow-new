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

const marks = [
  { subject: "Math", mark: 78 },
  { subject: "CS", mark: 84 },
  { subject: "Physics", mark: 74 },
  { subject: "English", mark: 88 },
];

const attendance = [
  { week: "W1", value: 92 },
  { week: "W2", value: 90 },
  { week: "W3", value: 91 },
  { week: "W4", value: 88 },
  { week: "W5", value: 89 },
  { week: "W6", value: 91 },
];

const notifications = [
  {
    id: "s1",
    title: "Assignment graded",
    description: "ENG-101 Essay 2: 88/100",
    timestamp: "1h",
    unread: true,
  },
  {
    id: "s2",
    title: "Attendance warning",
    description: "Physics attendance dipped below 85% in the last 2 weeks.",
    timestamp: "2d",
  },
];

export default function StudentDashboard() {
  const { profile } = useAuth();
  const risk = "Yellow" as "Green" | "Yellow" | "Red";
  const riskTone = risk === "Green" ? "ai" : risk === "Yellow" ? "brand2" : "default";

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : profile?.email?.split('@')[0] || 'Student';

  return (
    <CampusShell
      role="student"
      title={`Welcome back, ${profile?.firstName || 'Student'} 👋`}
      notifications={notifications}
      user={{ name: displayName, role: "Student" }}
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Attendance %" value="89%" hint="Last 6 weeks" tone="brand2" />
          <StatCard label="Overall performance" value="81" hint="Avg. marks" />
          <StatCard label="AI Risk Level" value={risk} hint="Updated today" tone={riskTone} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Marks per subject</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <div className="h-full w-full text-primary">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marks} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[60, 95]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                      }}
                    />
                    <Bar dataKey="mark" fill="currentColor" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Coach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CoachItem tone="ai" title="What you're doing well">
                Strong performance in English and steady progress in CS.
              </CoachItem>
              <CoachItem tone="brand2" title="Watch this">
                Physics attendance is trending down — aim for 2 extra sessions this month.
              </CoachItem>
              <CoachItem tone="default" title="Next step">
                Review Physics Week 4 notes and complete 10 practice questions.
              </CoachItem>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance over time</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <div className="h-full w-full text-brand2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendance} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[84, 96]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                      }}
                    />
                    <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </CampusShell>
  );
}

function CoachItem({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone: "default" | "brand2" | "ai";
}) {
  const pill = tone === "ai" ? "bg-ai/10 text-ai" : tone === "brand2" ? "bg-brand2/10 text-brand2" : "bg-secondary";
  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${pill}`}>AI</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
