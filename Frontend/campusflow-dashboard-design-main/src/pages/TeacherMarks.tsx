import { useState, useEffect, useCallback } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import api from "@/lib/api";
import { BookOpen, Upload, Plus, Loader2, CheckCircle } from "lucide-react";

interface ClassItem { id: string; name: string; }
interface Student { id: string; name: string; email: string; }
interface Exam { id: string; name: string; max_marks: number; }
interface Subject { id: string; name: string; }

export default function TeacherMarks() {
    const { profile } = useAuth();
    const { toast } = useToast();

    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedExamId, setSelectedExamId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [marks, setMarks] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // New exam/subject form state
    const [newExamName, setNewExamName] = useState("");
    const [newExamMax, setNewExamMax] = useState("100");
    const [newSubjectName, setNewSubjectName] = useState("");
    const [showExamForm, setShowExamForm] = useState(false);
    const [showSubjectForm, setShowSubjectForm] = useState(false);

    // Fetch teacher's classes on mount
    useEffect(() => {
        if (!profile) return;
        api.get("/api/classes/teacher")
            .then(res => setClasses(res.data.data || []))
            .catch(err => console.error("Failed to fetch classes:", err));
    }, [profile]);

    // Fetch students, exams, subjects when class changes
    const fetchClassData = useCallback(async (classId: string) => {
        if (!classId) return;
        setLoading(true);
        setMarks({});
        setSelectedExamId("");
        setSelectedSubjectId("");
        try {
            const [studRes, examRes, subRes] = await Promise.all([
                api.get(`/api/teacher/students?classId=${classId}`),
                api.get(`/api/teacher/exams/${classId}`),
                api.get(`/api/teacher/subjects/${classId}`),
            ]);
            setStudents(studRes.data.data || []);
            setExams(examRes.data.data || []);
            setSubjects(subRes.data.data || []);
        } catch (err) {
            console.error("Failed to fetch class data:", err);
            toast({ title: "Error", description: "Failed to load class data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (selectedClassId) fetchClassData(selectedClassId);
    }, [selectedClassId, fetchClassData]);

    // Realtime: refresh when marks table changes
    useRealtime({
        table: "marks",
        event: "*",
        callback: () => {
            if (selectedClassId) fetchClassData(selectedClassId);
        },
    });

    const handleMarkChange = (studentId: string, value: string) => {
        setMarks(prev => ({ ...prev, [studentId]: value }));
    };

    const handleSubmitMarks = async () => {
        if (!selectedClassId || !selectedExamId || !selectedSubjectId) {
            toast({ title: "Missing fields", description: "Please select class, exam, and subject.", variant: "destructive" });
            return;
        }
        const marksArray = students
            .filter(s => marks[s.id] !== undefined && marks[s.id] !== "")
            .map(s => ({ studentId: s.id, marksObtained: Number(marks[s.id]) }));

        if (marksArray.length === 0) {
            toast({ title: "No marks entered", description: "Enter at least one mark.", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            await api.post("/api/teacher/marks", {
                classId: selectedClassId,
                examId: selectedExamId,
                subjectId: selectedSubjectId,
                marks: marksArray,
            });
            setSubmitted(true);
            toast({ title: "✅ Marks uploaded!", description: `${marksArray.length} marks saved successfully.` });
            setTimeout(() => setSubmitted(false), 3000);
        } catch (err: any) {
            toast({ title: "Upload failed", description: err.response?.data?.error?.message || "Unknown error", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateExam = async () => {
        if (!newExamName.trim() || !selectedClassId) return;
        try {
            await api.post("/api/teacher/exams", { classId: selectedClassId, name: newExamName, maxMarks: Number(newExamMax) });
            toast({ title: "Exam created!" });
            setNewExamName(""); setShowExamForm(false);
            fetchClassData(selectedClassId);
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.error?.message, variant: "destructive" });
        }
    };

    const handleCreateSubject = async () => {
        if (!newSubjectName.trim() || !selectedClassId) return;
        try {
            await api.post("/api/teacher/subjects", { classId: selectedClassId, name: newSubjectName });
            toast({ title: "Subject created!" });
            setNewSubjectName(""); setShowSubjectForm(false);
            fetchClassData(selectedClassId);
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.error?.message, variant: "destructive" });
        }
    };

    const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "Teacher";

    return (
        <CampusShell role="teacher" title="Marks Management" user={{ name: displayName, role: "Teacher" }}>
            <div className="space-y-6">
                {/* Class Selector */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Upload Marks</CardTitle>
                        <CardDescription>Select a class, exam, and subject to upload marks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                <label className="text-sm font-medium mb-1 block">Exam</label>
                                <div className="flex gap-2">
                                    <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={!selectedClassId}>
                                        <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                                        <SelectContent>
                                            {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.max_marks})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {selectedClassId && (
                                        <Button variant="outline" size="icon" onClick={() => setShowExamForm(!showExamForm)}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                {showExamForm && (
                                    <div className="flex gap-2 mt-2">
                                        <Input placeholder="Exam name" value={newExamName} onChange={e => setNewExamName(e.target.value)} />
                                        <Input placeholder="Max" type="number" value={newExamMax} onChange={e => setNewExamMax(e.target.value)} className="w-20" />
                                        <Button size="sm" onClick={handleCreateExam}>Add</Button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Subject</label>
                                <div className="flex gap-2">
                                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                                        <SelectContent>
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {selectedClassId && (
                                        <Button variant="outline" size="icon" onClick={() => setShowSubjectForm(!showSubjectForm)}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                {showSubjectForm && (
                                    <div className="flex gap-2 mt-2">
                                        <Input placeholder="Subject name" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
                                        <Button size="sm" onClick={handleCreateSubject}>Add</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Marks Entry Table */}
                {selectedClassId && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Enter Marks</CardTitle>
                            <CardDescription>{students.length} student(s) in this class</CardDescription>
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
                                                <TableHead className="w-32">Marks Obtained</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-medium">{student.name}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{student.email}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            placeholder="0"
                                                            value={marks[student.id] || ""}
                                                            onChange={e => handleMarkChange(student.id, e.target.value)}
                                                            className="w-24"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="mt-4 flex justify-end">
                                        <Button onClick={handleSubmitMarks} disabled={submitting || !selectedExamId || !selectedSubjectId}>
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : submitted ? <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> : <Upload className="h-4 w-4 mr-2" />}
                                            {submitting ? "Uploading..." : submitted ? "Uploaded!" : "Upload Marks"}
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
