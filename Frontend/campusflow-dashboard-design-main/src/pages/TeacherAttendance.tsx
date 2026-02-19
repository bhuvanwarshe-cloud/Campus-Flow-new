import { useState, useEffect, useCallback } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import api from "@/lib/api";
import { Calendar, CheckCircle, Loader2, Save } from "lucide-react";

interface ClassItem { id: string; name: string; }
interface Student { id: string; name: string; email: string; }
type AttendanceStatus = "present" | "absent" | "late";

export default function TeacherAttendance() {
    const { profile } = useAuth();
    const { toast } = useToast();

    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Fetch teacher's classes
    useEffect(() => {
        if (!profile) return;
        api.get("/api/classes/teacher")
            .then(res => setClasses(res.data.data || []))
            .catch(err => console.error("Failed to fetch classes:", err));
    }, [profile]);

    // Fetch students when class changes
    const fetchStudents = useCallback(async (classId: string) => {
        if (!classId) return;
        setLoading(true);
        setAttendance({});
        try {
            const res = await api.get(`/api/teacher/students?classId=${classId}`);
            const studentList: Student[] = res.data.data || [];
            setStudents(studentList);
            // Default all to present
            const defaults: Record<string, AttendanceStatus> = {};
            studentList.forEach(s => { defaults[s.id] = "present"; });
            setAttendance(defaults);
        } catch (err) {
            console.error("Failed to fetch students:", err);
            toast({ title: "Error", description: "Failed to load students.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (selectedClassId) fetchStudents(selectedClassId);
    }, [selectedClassId, fetchStudents]);

    // Realtime: refresh on attendance changes
    useRealtime({
        table: "attendance",
        event: "*",
        callback: () => {
            if (selectedClassId) fetchStudents(selectedClassId);
        },
    });

    const setStatus = (studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const markAll = (status: AttendanceStatus) => {
        const updated: Record<string, AttendanceStatus> = {};
        students.forEach(s => { updated[s.id] = status; });
        setAttendance(updated);
    };

    const handleSubmit = async () => {
        if (!selectedClassId) {
            toast({ title: "Select a class first", variant: "destructive" });
            return;
        }
        if (students.length === 0) {
            toast({ title: "No students to mark", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const attendanceArray = students.map(s => ({
                studentId: s.id,
                status: attendance[s.id] || "present",
            }));

            await api.post("/api/teacher/attendance", {
                classId: selectedClassId,
                date,
                attendance: attendanceArray,
            });

            setSubmitted(true);
            toast({ title: "✅ Attendance saved!", description: `Recorded for ${students.length} students on ${date}.` });
            setTimeout(() => setSubmitted(false), 3000);
        } catch (err: any) {
            toast({ title: "Failed to save", description: err.response?.data?.error?.message || "Unknown error", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const statusBadge = (status: AttendanceStatus) => {
        if (status === "present") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Present</Badge>;
        if (status === "late") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Late</Badge>;
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Absent</Badge>;
    };

    const presentCount = Object.values(attendance).filter(s => s === "present").length;
    const absentCount = Object.values(attendance).filter(s => s === "absent").length;
    const lateCount = Object.values(attendance).filter(s => s === "late").length;

    const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "Teacher";

    return (
        <CampusShell role="teacher" title="Attendance" user={{ name: displayName, role: "Teacher" }}>
            <div className="space-y-6">
                {/* Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Mark Attendance</CardTitle>
                        <CardDescription>Select a class and date to record attendance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Class</label>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            {selectedClassId && students.length > 0 && (
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Bulk Actions</label>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => markAll("present")}>All Present</Button>
                                        <Button variant="outline" size="sm" onClick={() => markAll("absent")}>All Absent</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Stats */}
                {selectedClassId && students.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="pt-4">
                                <p className="text-2xl font-bold text-green-700">{presentCount}</p>
                                <p className="text-sm text-green-600">Present</p>
                            </CardContent>
                        </Card>
                        <Card className="border-yellow-200 bg-yellow-50">
                            <CardContent className="pt-4">
                                <p className="text-2xl font-bold text-yellow-700">{lateCount}</p>
                                <p className="text-sm text-yellow-600">Late</p>
                            </CardContent>
                        </Card>
                        <Card className="border-red-200 bg-red-50">
                            <CardContent className="pt-4">
                                <p className="text-2xl font-bold text-red-700">{absentCount}</p>
                                <p className="text-sm text-red-600">Absent</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Student Table */}
                {selectedClassId && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Students</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                            ) : students.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No students enrolled in this class.</p>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-medium">{student.name}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{student.email}</TableCell>
                                                    <TableCell>{statusBadge(attendance[student.id] || "present")}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            {(["present", "late", "absent"] as AttendanceStatus[]).map(s => (
                                                                <Button
                                                                    key={s}
                                                                    size="sm"
                                                                    variant={attendance[student.id] === s ? "default" : "outline"}
                                                                    onClick={() => setStatus(student.id, s)}
                                                                    className="capitalize text-xs"
                                                                >
                                                                    {s}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="mt-4 flex justify-end">
                                        <Button onClick={handleSubmit} disabled={submitting}>
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : submitted ? <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> : <Save className="h-4 w-4 mr-2" />}
                                            {submitting ? "Saving..." : submitted ? "Saved!" : "Save Attendance"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </CampusShell>
    );
}
