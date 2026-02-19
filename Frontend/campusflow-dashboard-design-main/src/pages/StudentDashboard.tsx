import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { StatCard } from "@/components/campusflow/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { toast } from "sonner";
import { Megaphone, Loader2, Clock } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  classes?: { name: string };
}

interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  attendancePct: number;
}

export default function StudentDashboard() {
  const { profile } = useAuth();

  const [marks, setMarks] = useState<any[]>([]);
  const [marksSummary, setMarksSummary] = useState<{ total: number; average: number }>({ total: 0, average: 0 });
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({ total: 0, present: 0, late: 0, absent: 0, attendancePct: 0 });
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch marks ──────────────────────────────────────────────────────────────
  const fetchMarks = useCallback(async () => {
    try {
      const { data } = await api.get("/api/student/marks");
      if (data.success) {
        const formatted = data.data.map((m: any) => ({
          subject: m.subject?.name || m.subjects?.name || "Unknown",
          mark: m.marks_obtained,
          max: m.exam?.max_marks || m.exams?.max_marks || 100,
        }));
        setMarks(formatted);
        setMarksSummary(data.summary || { total: formatted.length, average: 0 });
      }
    } catch (err) {
      // Fallback to old endpoint
      try {
        const { data } = await api.get("/api/marks/me");
        if (data.success) {
          const formatted = data.data.map((m: any) => ({
            subject: m.subject?.name || "Unknown",
            mark: m.marks_obtained,
            max: m.exam?.max_marks || 100,
          }));
          setMarks(formatted);
        }
      } catch { /* silent */ }
    }
  }, []);

  // ── Fetch attendance ─────────────────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      const { data } = await api.get("/api/student/attendance");
      if (data.success) {
        setAttendanceSummary(data.summary || { total: 0, present: 0, late: 0, absent: 0, attendancePct: 0 });

        // Build weekly chart data from records
        const records: any[] = data.data || [];
        const weekMap: Record<string, { present: number; total: number }> = {};
        records.forEach((r: any) => {
          const d = new Date(r.date);
          const week = `W${Math.ceil(d.getDate() / 7)}`;
          if (!weekMap[week]) weekMap[week] = { present: 0, total: 0 };
          weekMap[week].total++;
          if (r.status === "present" || r.status === "late") weekMap[week].present++;
        });

        const chartData = Object.entries(weekMap)
          .slice(-6)
          .map(([week, v]) => ({ week, value: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0 }));

        setAttendanceHistory(chartData.length > 0 ? chartData : [
          { week: "W1", value: 0 }, { week: "W2", value: 0 }, { week: "W3", value: 0 },
        ]);
      }
    } catch { /* silent */ }
  }, []);

  // ── Fetch announcements ──────────────────────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get("/api/student/announcements");
      if (data.success) setAnnouncements(data.data || []);
    } catch { /* silent */ }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchMarks(), fetchAttendance(), fetchAnnouncements()])
      .finally(() => setLoading(false));
  }, [fetchMarks, fetchAttendance, fetchAnnouncements]);

  // ── Realtime subscriptions ───────────────────────────────────────────────────
  useRealtime({
    table: "marks",
    event: "*",
    callback: () => {
      toast.info("Marks updated!");
      fetchMarks();
    },
  });

  useRealtime({
    table: "attendance",
    event: "*",
    callback: () => {
      fetchAttendance();
    },
  });

  useRealtime({
    table: "announcements",
    event: "INSERT",
    callback: (payload: any) => {
      toast.info(`📢 New announcement: ${payload?.new?.title || "Check announcements"}`);
      fetchAnnouncements();
    },
  });

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : profile?.email?.split("@")[0] || "Student";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <CampusShell
      role="student"
      title={`Welcome back, ${profile?.firstName || "Student"} 👋`}
      user={{ name: displayName, role: "Student" }}
    >
      <div className="grid gap-6">
        {/* ── Stat Cards ── */}
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Attendance %"
            value={`${attendanceSummary.attendancePct}%`}
            hint={`${attendanceSummary.present} present / ${attendanceSummary.total} total`}
            tone="brand2"
          />
          <StatCard
            label="Avg. Marks"
            value={marksSummary.average > 0 ? `${marksSummary.average}` : "—"}
            hint={`Across ${marksSummary.total} exam(s)`}
          />
          <StatCard
            label="Announcements"
            value={`${announcements.length}`}
            hint="From your classes"
            tone="ai"
          />
        </section>

        {/* ── Marks Chart + Announcements ── */}
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Marks per Subject</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : marks.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-muted-foreground">
                  <p className="text-sm">No marks recorded yet.</p>
                </div>
              ) : (
                <div className="h-full w-full text-primary">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={marks} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
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
              )}
            </CardContent>
          </Card>

          {/* ── Announcements Feed ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4" /> Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[280px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No announcements yet.</p>
              ) : (
                announcements.slice(0, 5).map(a => (
                  <div key={a.id} className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{a.title}</p>
                      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDate(a.created_at)}
                      </span>
                    </div>
                    {a.classes?.name && (
                      <Badge variant="outline" className="text-xs">{a.classes.name}</Badge>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Attendance Chart ── */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Over Time</CardTitle>
            </CardHeader>
            <CardContent className="h-[240px]">
              {attendanceHistory.length === 0 ? (
                <div className="flex justify-center items-center h-full text-muted-foreground text-sm">
                  No attendance data yet.
                </div>
              ) : (
                <div className="h-full w-full text-brand2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceHistory} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                        }}
                        formatter={(v: any) => [`${v}%`, "Attendance"]}
                      />
                      <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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
