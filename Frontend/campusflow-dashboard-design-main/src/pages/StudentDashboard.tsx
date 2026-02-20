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
import { Megaphone, Loader2, Clock, Bell, TrendingUp, AlertTriangle, CheckCircle, Award } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  classes?: { name: string };
  name: string;
}

interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  attendancePct: number;
}

interface AttendanceSummaryData {
  present: number;
  total: number;
  percentage: number;
  comment: string;
}

interface ProgressData {
  avgMarks: number;
  attendancePct: number;
  standing: string;
  combinedScore: number;
  rankEstimate: { rank: number; totalStudents: number; percentile: number } | null;
  totalExams: number;
  totalClassDays: number;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  source: string;
  class_name?: string;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { profile } = useAuth();

  const [marks, setMarks] = useState<any[]>([]);
  const [marksSummary, setMarksSummary] = useState<{ total: number; average: number }>({ total: 0, average: 0 });
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({ total: 0, present: 0, late: 0, absent: 0, attendancePct: 0 });
  const [attendanceComment, setAttendanceComment] = useState<AttendanceSummaryData | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
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
          teacher: m.teacher_name || m.teacher?.full_name || "—",
        }));
        setMarks(formatted);
        setMarksSummary(data.summary || { total: formatted.length, average: 0 });
      }
    } catch {
      try {
        const { data } = await api.get("/api/marks/me");
        if (data.success) {
          const formatted = data.data.map((m: any) => ({
            subject: m.subject?.name || "Unknown",
            mark: m.marks_obtained,
            max: m.exam?.max_marks || 100,
            teacher: "—",
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

  // ── Fetch attendance summary with comment ──────────────────────────────────
  const fetchAttendanceComment = useCallback(async () => {
    try {
      const { data } = await api.get("/api/student/attendance/summary");
      if (data.success) setAttendanceComment(data.data);
    } catch { /* silent */ }
  }, []);

  // ── Fetch announcements ──────────────────────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get("/api/student/announcements");
      if (data.success) setAnnouncements(data.data || []);
    } catch { /* silent */ }
  }, []);

  // ── Fetch notifications ──────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/api/student/notifications");
      if (data.success) setNotifications(data.data || []);
    } catch { /* silent */ }
  }, []);

  // ── Fetch progress ───────────────────────────────────────────────────────────
  const fetchProgress = useCallback(async () => {
    try {
      const { data } = await api.get("/api/student/progress");
      if (data.success) setProgress(data.data);
    } catch { /* silent */ }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchMarks(),
      fetchAttendance(),
      fetchAttendanceComment(),
      fetchAnnouncements(),
      fetchNotifications(),
      fetchProgress(),
    ]).finally(() => setLoading(false));
  }, [fetchMarks, fetchAttendance, fetchAttendanceComment, fetchAnnouncements, fetchNotifications, fetchProgress]);

  // ── Realtime subscriptions ───────────────────────────────────────────────────
  useRealtime({
    table: "marks",
    event: "*",
    callback: () => {
      toast.info("Marks updated!");
      fetchMarks();
      fetchProgress();
    },
  });

  useRealtime({
    table: "attendance",
    event: "*",
    callback: () => {
      fetchAttendance();
      fetchAttendanceComment();
      fetchProgress();
    },
  });

  useRealtime({
    table: "announcements",
    event: "INSERT",
    callback: (payload: any) => {
      toast.info(`📢 New announcement: ${payload?.new?.title || "Check announcements"}`);
      fetchAnnouncements();
      fetchNotifications();
    },
  });

  useRealtime({
    table: "notifications",
    event: "INSERT",
    callback: (payload: any) => {
      toast.info(`🔔 ${payload?.new?.title || "New notification"}`);
      fetchNotifications();
    },
  });

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : profile?.email?.split("@")[0] || "Student";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const getCommentColor = (comment: string) => {
    if (comment.includes("Excellent")) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (comment.includes("Good")) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (comment.includes("Warning")) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-red-500/10 text-red-600 border-red-500/20";
  };

  const getStandingIcon = (standing: string) => {
    if (standing === "Excellent") return <Award className="h-5 w-5 text-emerald-500" />;
    if (standing === "Good") return <TrendingUp className="h-5 w-5 text-blue-500" />;
    if (standing === "Average") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  return (
    <CampusShell
      role="student"
      title={`Welcome back, ${profile?.firstName || "Student"} 👋`}
      user={{ name: displayName, role: "Student" }}
    >
      <div className="grid gap-6">
        {/* ── Stat Cards ── */}
        <section className="grid gap-4 md:grid-cols-4">
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
          <StatCard
            label="Standing"
            value={progress?.standing || "—"}
            hint={progress?.rankEstimate ? `Rank #${progress.rankEstimate.rank} of ${progress.rankEstimate.totalStudents}` : "Loading..."}
          />
        </section>

        {/* ── Attendance Comment Badge ── */}
        {attendanceComment && (
          <section>
            <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${getCommentColor(attendanceComment.comment)}`}>
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{attendanceComment.comment}</p>
                <p className="text-xs opacity-80">
                  {attendanceComment.present}/{attendanceComment.total} days present · {attendanceComment.percentage}% attendance
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Progress Summary Card ── */}
        {progress && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {getStandingIcon(progress.standing)} Progress Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{progress.avgMarks}</p>
                    <p className="text-xs text-muted-foreground">Avg. Marks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{progress.attendancePct}%</p>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{progress.combinedScore}</p>
                    <p className="text-xs text-muted-foreground">Combined Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {progress.rankEstimate ? `${progress.rankEstimate.percentile}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Percentile</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Marks Chart + Notifications ── */}
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
                        formatter={(v: any, _name: any, props: any) => [
                          `${v}/${props.payload.max} (by ${props.payload.teacher})`,
                          "Marks"
                        ]}
                      />
                      <Bar dataKey="mark" fill="currentColor" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Notifications Feed ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notifications
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <Badge variant="destructive" className="text-xs ml-auto">
                    {notifications.filter(n => !n.is_read).length} new
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[280px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notifications yet.</p>
              ) : (
                notifications.slice(0, 8).map(n => (
                  <div key={n.id} className={`rounded-lg border p-3 space-y-1 ${!n.is_read ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {n.source === "announcement" ? (
                          <Megaphone className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Bell className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        )}
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDate(n.created_at)}
                      </span>
                    </div>
                    {n.class_name && (
                      <Badge variant="outline" className="text-xs">{n.class_name}</Badge>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Marks Table with Teacher Name ── */}
        {marks.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detailed Marks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Subject</th>
                        <th className="pb-2 font-medium">Marks</th>
                        <th className="pb-2 font-medium">Max</th>
                        <th className="pb-2 font-medium">Teacher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marks.map((m, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-medium">{m.subject}</td>
                          <td className="py-2">{m.mark}</td>
                          <td className="py-2 text-muted-foreground">{m.max}</td>
                          <td className="py-2 text-muted-foreground">{m.teacher}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Announcements Feed ── */}
        <section className="grid gap-4 lg:grid-cols-2">
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

          {/* ── Attendance Chart ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Over Time</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
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
