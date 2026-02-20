import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, TrendingDown, Users, Loader2, AlertCircle } from "lucide-react";

import { CampusShell } from "@/components/campusflow/CampusShell";
import { StatCard } from "@/components/campusflow/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface WeakClass {
  class_id: string;
  class_name: string;
  avg_marks: number;
}

interface LowAttendanceClass {
  class_id: string;
  class_name: string;
  attendance_pct: number;
}

interface TeacherWorkload {
  teacher_id: string;
  teacher_name: string;
  class_count: number;
  student_count: number;
}

interface AdminAcademicsPayload {
  weakClasses: WeakClass[];
  lowAttendanceClasses: LowAttendanceClass[];
  teacherWorkload: TeacherWorkload[];
}

export default function AdminAnalytics() {
  const { profile } = useAuth();
  const [data, setData] = useState<AdminAcademicsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : "Administrator";

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/api/admin/academics");
        if (!data?.success) {
          throw new Error(data?.error?.message || "Failed to load analytics");
        }
        setData(data.data);
      } catch (err: any) {
        console.error("Failed to fetch admin academics:", err);
        setError(
          err?.response?.data?.error?.message ||
            err?.message ||
            "Failed to load analytics"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const weakClasses = data?.weakClasses || [];
  const lowAttendance = data?.lowAttendanceClasses || [];
  const workloads = data?.teacherWorkload || [];

  return (
    <CampusShell
      role="admin"
      title="Academic Analytics"
      user={{ name: displayName, role: "Admin" }}
    >
      <div className="grid gap-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Weak Classes"
            value={String(weakClasses.length)}
            hint="Below marks threshold"
            tone="default"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <StatCard
            label="Low Attendance"
            value={String(lowAttendance.length)}
            hint="Below attendance threshold"
            tone="brand2"
            icon={<Activity className="h-4 w-4" />}
          />
          <StatCard
            label="Active Teachers"
            value={String(workloads.length)}
            hint="With assigned classes"
            icon={<Users className="h-4 w-4" />}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weak classes by average marks</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading marks insight...
                </div>
              ) : weakClasses.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No weak classes detected with the current threshold.
                </div>
              ) : (
                <div className="h-full w-full text-primary">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weakClasses.slice(0, 8)}
                      margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="class_name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tick={{ width: 80 }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                        }}
                        formatter={(value: any) => [`${value}`, "Avg marks"]}
                      />
                      <Bar dataKey="avg_marks" radius={[8, 8, 0, 0]} fill="currentColor" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Low attendance classes</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading attendance insight...
                </div>
              ) : lowAttendance.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No low-attendance classes detected with the current threshold.
                </div>
              ) : (
                <div className="h-full w-full text-brand2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={lowAttendance.slice(0, 8)}
                      margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="class_name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                        }}
                        formatter={(value: any) => [`${value}%`, "Attendance"]}
                      />
                      <Bar dataKey="attendance_pct" radius={[8, 8, 0, 0]} fill="currentColor" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Teacher workload</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading workload...
                </div>
              ) : workloads.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No teacher workload data available.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Classes</TableHead>
                        <TableHead>Students</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workloads.map((t) => (
                        <TableRow key={t.teacher_id}>
                          <TableCell className="font-medium">
                            {t.teacher_name}
                          </TableCell>
                          <TableCell>{t.class_count}</TableCell>
                          <TableCell>{t.student_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </CampusShell>
  );
}

