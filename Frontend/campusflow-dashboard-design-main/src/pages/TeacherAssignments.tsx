import { useState, useEffect, useCallback } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import api from "@/lib/api";
import { FileText, Plus, Loader2, Download, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ClassItem { id: string; name: string; }
interface Assignment {
    id: string;
    title: string;
    description: string;
    deadline: string;
    class_id: string;
    classes: { name: string };
    created_at: string;
}
interface Submission {
    id: string;
    student_id: string;
    file_url: string;
    submitted_at: string;
    status: 'on-time' | 'late';
    students: { name: string; email: string };
}

export default function TeacherAssignments() {
    const { profile } = useAuth();
    const { toast } = useToast();

    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);

    const [newAssignment, setNewAssignment] = useState({
        title: "",
        description: "",
        classId: "",
        deadline: ""
    });

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fetchingSubmissions, setFetchingSubmissions] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [classesRes, assignmentsRes] = await Promise.all([
                api.get("/api/classes/teacher"),
                api.get("/api/assignments/teacher")
            ]);
            setClasses(classesRes.data.data || []);
            setAssignments(assignmentsRes.data.data || []);
        } catch (err) {
            console.error("Failed to fetch data:", err);
            toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (profile) fetchData();
    }, [profile, fetchData]);

    // Realtime: Listen for new submissions
    useRealtime({
        table: "assignment_submissions",
        callback: () => {
            if (selectedAssignment) viewSubmissions(selectedAssignment);
        }
    });

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAssignment.title || !newAssignment.classId || !newAssignment.deadline) {
            toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            await api.post("/api/assignments/teacher", newAssignment);
            toast({ title: "Assignment created!" });
            setNewAssignment({ title: "", description: "", classId: "", deadline: "" });
            fetchData();
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.error?.message || "Failed to create assignment", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const viewSubmissions = async (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setFetchingSubmissions(true);
        try {
            const res = await api.get(`/api/assignments/teacher/${assignment.id}/submissions`);
            setSubmissions(res.data.data || []);
        } catch (err) {
            toast({ title: "Error", description: "Failed to load submissions", variant: "destructive" });
        } finally {
            setFetchingSubmissions(false);
        }
    };

    const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "Teacher";

    return (
        <CampusShell role="teacher" title="Assignments" user={{ name: displayName, role: "Teacher" }}>
            <div className="grid gap-6 md:grid-cols-2">
                {/* Create Assignment Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> New Assignment</CardTitle>
                        <CardDescription>Create a task for your students.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateAssignment} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title *</label>
                                <Input
                                    placeholder="Assignment Title"
                                    value={newAssignment.title}
                                    onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea
                                    placeholder="Instructions..."
                                    value={newAssignment.description}
                                    onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Class *</label>
                                    <Select value={newAssignment.classId} onValueChange={val => setNewAssignment({ ...newAssignment, classId: val })}>
                                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                        <SelectContent>
                                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Deadline *</label>
                                    <Input
                                        type="datetime-local"
                                        value={newAssignment.deadline}
                                        onChange={e => setNewAssignment({ ...newAssignment, deadline: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                Create Assignment
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Assignments List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Assignment History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : assignments.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No assignments created yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {assignments.map(a => (
                                    <div key={a.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold">{a.title}</h4>
                                                <p className="text-sm text-muted-foreground mb-2">{a.classes?.name}</p>
                                                <Badge variant="outline" className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(a.deadline), "PPP p")}
                                                </Badge>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => viewSubmissions(a)}>
                                                Submissions
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Submissions Section */}
            {selectedAssignment && (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Submissions: {selectedAssignment.title}</CardTitle>
                        <CardDescription>View and download student work.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {fetchingSubmissions ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : submissions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No submissions received yet.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Submitted At</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell>
                                                <div className="font-medium">{s.students?.name}</div>
                                                <div className="text-xs text-muted-foreground">{s.students?.email}</div>
                                            </TableCell>
                                            <TableCell>{format(new Date(s.submitted_at), "PPP p")}</TableCell>
                                            <TableCell>
                                                <Badge variant={s.status === 'on-time' ? 'default' : 'destructive'}>
                                                    {s.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" asChild>
                                                    <a href={s.file_url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-4 w-4 mr-2" /> Download
                                                    </a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                    <div className="p-4 border-t flex justify-end">
                        <Button variant="ghost" onClick={() => setSelectedAssignment(null)}>Close</Button>
                    </div>
                </Card>
            )}
        </CampusShell>
    );
}
