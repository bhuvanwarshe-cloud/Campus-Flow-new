import { useState, useEffect } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { analyticsService, ClassAnalyticsResponse } from "@/lib/analyticsService";
import { useToast } from "@/hooks/use-toast";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    Users,
    Percent,
    GraduationCap,
    TrendingUp,
    TrendingDown,
    Loader2
} from "lucide-react";

// Assuming you have a way to fetch the teacher's classes. 
// Using a mock or a placeholder api call for now.
import api from "@/lib/api";

export default function TeacherAnalytics() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const { toast } = useToast();
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [analytics, setAnalytics] = useState<ClassAnalyticsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Guard for role
    if (profile?.role !== "teacher") {
        return (
            <CampusShell role="teacher" title="Class Analytics" user={{ name: profile?.firstName || "Teacher", role: "Teacher" }}>
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">You do not have permission to view this page.</p>
                </div>
            </CampusShell>
        );
    }

    // Fetch assigned classes on mount
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                // Query teacher_class_assignments
                const response = await api.get(`/teacher/classes`);
                if (response.data?.success) {
                    setClasses(response.data.data);
                    if (response.data.data.length > 0) {
                        setSelectedClassId(response.data.data[0].id);
                    }
                }
            } catch (err: any) {
                toast({
                    title: "Error fetching classes",
                    description: err.message,
                    variant: "destructive",
                });
            }
        };
        if (user) {
            fetchClasses();
        }
    }, [user]);

    // Fetch analytics when class changes
    useEffect(() => {
        if (!selectedClassId) return;

        const fetchAnalytics = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await analyticsService.getTeacherClassAnalytics(selectedClassId);
                setAnalytics(data);
            } catch (err: any) {
                setError(err.message);
                toast({
                    title: "Failed to load analytics",
                    description: err.message,
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [selectedClassId]);

    // Format data for Recharts
    const distributionData = analytics ? [
        { name: "0-40%", students: analytics.distribution['0_40'] },
        { name: "41-60%", students: analytics.distribution['41_60'] },
        { name: "61-80%", students: analytics.distribution['61_80'] },
        { name: "81-100%", students: analytics.distribution['81_100'] },
    ] : [];

    return (
        <CampusShell role="teacher" title="Class Analytics" user={{ name: profile?.firstName || "Teacher", role: "Teacher" }}>
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Class Analytics</h2>
                        <p className="text-muted-foreground">
                            Overview of student performance and attendance.
                        </p>
                    </div>

                    <div className="w-full sm:w-64">
                        <Select
                            value={selectedClassId}
                            onValueChange={setSelectedClassId}
                            disabled={isLoading || classes.length === 0}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {error ? (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <p className="text-destructive font-medium">{error}</p>
                        </CardContent>
                    </Card>
                ) : isLoading ? (
                    <div className="flex h-[400px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : analytics ? (
                    <>
                        {/* Top Stats Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Total Students
                                    </CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {analytics.metrics.totalStudents}
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-1">
                                        Currently enrolled and approved
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Class Average
                                    </CardTitle>
                                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {analytics.metrics.classAverage}%
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-1">
                                        Overall subject performance
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Attendance Rate
                                    </CardTitle>
                                    <Percent className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {analytics.metrics.attendanceRate}%
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-1">
                                        Average class attendance
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            {/* Distribution Chart */}
                            <Card className="col-span-4 max-h-[450px]">
                                <CardHeader>
                                    <CardTitle>Marks Distribution</CardTitle>
                                    <CardDescription>
                                        Number of students across percentage buckets
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={distributionData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                cursor={{ fill: 'transparent' }}
                                            />
                                            <Bar
                                                dataKey="students"
                                                fill="hsl(var(--primary))"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Performance Tables */}
                            <div className="col-span-4 lg:col-span-3 space-y-4">
                                <Card className="h-1/2 overflow-hidden flex flex-col">
                                    <CardHeader className="py-4">
                                        <CardTitle className="text-base flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-500" />
                                                Top 5 Students
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-1 overflow-auto">
                                        {analytics.performance.topStudents.length > 0 ? (
                                            <div className="divide-y relative h-full">
                                                {analytics.performance.topStudents.map((student, i) => (
                                                    <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/50">
                                                        <span className="font-medium text-sm">{student.full_name}</span>
                                                        <span className="font-bold text-sm text-green-600 dark:text-green-400">
                                                            {student.avg_percent}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-sm text-muted-foreground text-center">No data available</div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="h-1/2 overflow-hidden flex flex-col">
                                    <CardHeader className="py-4">
                                        <CardTitle className="text-base flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-500" />
                                                Bottom 5 Students
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-1 overflow-auto">
                                        {analytics.performance.bottomStudents.length > 0 ? (
                                            <div className="divide-y relative h-full">
                                                {analytics.performance.bottomStudents.map((student, i) => (
                                                    <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/50">
                                                        <span className="font-medium text-sm">{student.full_name}</span>
                                                        <span className="font-bold text-sm text-red-600 dark:text-red-400">
                                                            {student.avg_percent}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-sm text-muted-foreground text-center">No data available</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex h-[400px] items-center justify-center">
                        <p className="text-muted-foreground">Select a class to view analytics</p>
                    </div>
                )}
            </div>
        </CampusShell>
    );
}
