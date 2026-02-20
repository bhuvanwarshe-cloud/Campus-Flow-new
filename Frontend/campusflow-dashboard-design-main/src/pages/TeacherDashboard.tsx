import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  CalendarCheck,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react";

import { CampusShell } from "@/components/campusflow/CampusShell";
import { StatCard } from "@/components/campusflow/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { FileUpload } from "@/components/campusflow/FileUpload";

const classPulse = [
  { day: "Mon", attention: 78 },
  { day: "Tue", attention: 74 },
  { day: "Wed", attention: 82 },
  { day: "Thu", attention: 76 },
  { day: "Fri", attention: 84 },
];

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    attendanceTaken: 0,
    pendingtasks: 0
  });

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : 'Teacher';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch real stats from backend
        const [classesRes, statsRes] = await Promise.allSettled([
          api.get('/api/classes/teacher'),
          api.get('/api/teacher/stats'),
        ]);

        const classes = classesRes.status === 'fulfilled' ? (classesRes.value.data.data || []) : [];
        const statsData = statsRes.status === 'fulfilled' && statsRes.value.data.success
          ? statsRes.value.data.data
          : null;

        setStats({
          totalClasses: statsData?.totalClasses ?? classes.length,
          totalStudents: statsData?.totalStudents ?? classes.reduce((acc: number, cls: any) => acc + (cls.student_count || 0), 0),
          attendanceTaken: 0,
          pendingtasks: 0,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.id) {
      fetchDashboardData();
    }
  }, [profile]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <CampusShell
      role="teacher"
      title={`Welcome back, ${displayName} 👋`}
      user={{ name: displayName, role: "Teacher" }}
    >
      <div className="grid gap-6">
        {/* Stats Row */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Classes"
            value={String(stats.totalClasses)}
            hint="Assigned to you"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Total Students"
            value={String(stats.totalStudents)}
            hint="Across all classes"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Attendance"
            value="Today"
            hint="Pending for 2 classes"
            tone="brand2"
            icon={<Clock className="h-4 w-4" />}
          />
          <StatCard
            label="Pending Tasks"
            value={String(stats.pendingtasks)}
            hint="Marks upload pending"
            tone="default"
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </section>

        {/* Quick Actions & Recent Activity */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks you perform daily</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-brand2 hover:bg-brand2/5"
                onClick={() => navigate('/teacher/attendance')}
              >
                <div className="p-2 bg-brand2/10 rounded-full text-brand2">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                Take Attendance
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-brand2 hover:bg-brand2/5"
                onClick={() => navigate('/teacher/marks')}
              >
                <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
                Upload Marks
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-brand2 hover:bg-brand2/5"
                onClick={() => navigate('/teacher/notifications')}
              >
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
                Send Notification
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity (Mock for now, would be API backed) */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                <div className="mt-1 p-1 bg-green-100 rounded-full text-green-600">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Attendance Marked</p>
                  <p className="text-xs text-muted-foreground">CSE - Sem 4 • 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                <div className="mt-1 p-1 bg-purple-100 rounded-full text-purple-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Marks Updated</p>
                  <p className="text-xs text-muted-foreground">Midterm • Physics - A</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Class Engagement Pulse</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={classPulse} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} domain={[60, 100]} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      cursor={{ stroke: '#888', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Line type="monotone" dataKey="attention" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Upload</CardTitle>
              <CardDescription>Share resources with your students</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                bucket="course-materials"
                onUploadComplete={(data) => console.log("Uploaded:", data)}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </CampusShell>
  );
}

function DashboardSkeleton() {
  return (
    <CampusShell role="teacher" title="Loading..." user={{ name: "", role: "" }}>
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-[200px] w-full" />
      </div>
    </CampusShell>
  )
}
