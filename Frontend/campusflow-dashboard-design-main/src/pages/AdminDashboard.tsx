import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AlertCircle, Loader2 } from "lucide-react";

import { CampusShell } from "@/components/campusflow/CampusShell";
import { StatCard } from "@/components/campusflow/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtime } from "@/hooks/useRealtime";

interface AdminOverviewResponse {
  totals: {
    users: number;
    students: number;
    teachers: number;
    classes: number;
  };
  averages: {
    attendancePct: number;
    marks: number;
  };
}

export default function AdminDashboard() {
  const { profile } = useAuth();

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const backgroundFetchInFlightRef = useRef(false);

  const displayName =
    profile?.firstName && profile.lastName !== undefined
      ? `${profile.firstName} ${profile.lastName || ""}`.trim()
      : profile?.email?.split("@")[0] || "Admin";

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchOverview = useCallback(
    async (options?: { background?: boolean }) => {
      const isBackground = options?.background;

      if (isBackground) {
        if (backgroundFetchInFlightRef.current) return;
        backgroundFetchInFlightRef.current = true;
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const { data } = await api.get("/api/admin/overview");
        if (!data?.success || !data?.data) {
          throw new Error("Invalid admin overview response");
        }
        if (isMountedRef.current) {
          setOverview(data.data);
        }
      } catch (err: any) {
        console.error("Failed to fetch admin overview:", err);
        if (isMountedRef.current) {
          setError(
            err?.response?.data?.error?.message ||
              err?.message ||
              "Failed to load admin overview"
          );
        }
      } finally {
        if (isMountedRef.current) {
          if (isBackground) {
            backgroundFetchInFlightRef.current = false;
          } else {
            setLoading(false);
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Realtime updates: when core tables change, refresh overview in the background.
  const realtimeEnabled = true;

  useRealtime({
    table: "profiles", // app-level users
    event: "*",
    callback: () => fetchOverview({ background: true }),
    enabled: realtimeEnabled,
  });

  useRealtime({
    table: "enrollments",
    event: "*",
    callback: () => fetchOverview({ background: true }),
    enabled: realtimeEnabled,
  });

  useRealtime({
    table: "marks",
    event: "*",
    callback: () => fetchOverview({ background: true }),
    enabled: realtimeEnabled,
  });

  useRealtime({
    table: "attendance",
    event: "*",
    callback: () => fetchOverview({ background: true }),
    enabled: realtimeEnabled,
  });

  useRealtime({
    table: "audit_logs",
    event: "*",
    callback: () => fetchOverview({ background: true }),
    enabled: realtimeEnabled,
  });

  const attendanceTrend = useMemo(() => {
    const pct = overview?.averages.attendancePct ?? 0;
    // Use real average attendance as a flat trend (until historical API exists)
    return ["W1", "W2", "W3", "W4", "W5", "W6"].map((week) => ({
      week,
      attendance: pct,
    }));
  }, [overview]);

  const entityBreakdown = useMemo(
    () =>
      overview
        ? [
            { label: "Students", value: overview.totals.students },
            { label: "Teachers", value: overview.totals.teachers },
            { label: "Classes", value: overview.totals.classes },
          ]
        : [],
    [overview]
  );

  const totalUsers = overview?.totals.users ?? 0;

  return (
    <CampusShell
      role="admin"
      title={`Welcome back, ${profile?.firstName || "Admin"} 👋`}
      user={{ name: displayName, role: "Admin" }}
    >
      <div className="grid gap-6">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{typeof error === "string" ? error : "An error occurred"}</span>
          </div>
        )}

        {/* Stat cards */}
        <section className="grid gap-4 md:grid-cols-4">
          {loading && !overview ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </>
          ) : (
            <>
              <StatCard
                label="Total Students"
                value={String(overview?.totals.students ?? 0)}
                hint="Active student profiles"
              />
              <StatCard
                label="Total Teachers"
                value={String(overview?.totals.teachers ?? 0)}
                hint="Teaching staff"
              />
              <StatCard
                label="Total Classes"
                value={String(overview?.totals.classes ?? 0)}
                hint="Configured in system"
                tone="brand2"
              />
              <StatCard
                label="Avg. Attendance"
                value={`${overview?.averages.attendancePct ?? 0}%`}
                hint={`Across ${totalUsers} users`}
                tone="ai"
              />
            </>
          )}
        </section>

        {/* Charts row */}
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Attendance trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              {loading && !overview ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading attendance...
                </div>
              ) : !overview ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No attendance data available.
                </div>
              ) : (
                <div className="h-full w-full text-primary">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={attendanceTrend}
                      margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="week"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
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
                      <Line
                        type="monotone"
                        dataKey="attendance"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">System overview</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              {loading && !overview ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading overview...
                </div>
              ) : entityBreakdown.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No entities found yet.
                </div>
              ) : (
                <div className="h-full w-full text-brand2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={entityBreakdown}
                      margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
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
                      />
                      <Bar
                        dataKey="value"
                        fill="currentColor"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Summary card */}
        {overview && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  AI-ready governance snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Insight
                  title="Attendance health"
                  tone="ai"
                  badge="AI"
                >
                  Average attendance is{" "}
                  <strong>{overview.averages.attendancePct}%</strong>. Consider
                  targeting classes below 75% in Analytics.
                </Insight>
                <Insight title="Academic performance" tone="brand2" badge="Marks">
                  Average marks across all recorded exams is{" "}
                  <strong>{overview.averages.marks || 0}</strong>.
                </Insight>
                <Insight title="Coverage" tone="default" badge="System">
                  {overview.totals.students} students and{" "}
                  {overview.totals.teachers} teachers across{" "}
                  {overview.totals.classes} classes are currently active.
                </Insight>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </CampusShell>
  );
}

function Insight({
  title,
  children,
  tone,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  tone: "default" | "brand2" | "ai";
  badge?: string;
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
        {badge && (
          <span
            className={`rounded-full px-2 py-1 text-[11px] font-medium ${pillClass}`}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
