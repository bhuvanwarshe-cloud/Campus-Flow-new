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
import { ClipboardList, Plus, Loader2, Users, Calendar, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ClassItem { id: string; name: string; }
interface Test {
    id: string;
    title: string;
    duration: number;
    start_date: string;
    end_date: string;
    class_id: string;
    classes: { name: string };
    created_at: string;
}
interface TestResult {
    id: string;
    student_id: string;
    score: number;
    submitted_at: string;
    students: { name: string; email: string };
}
interface Question {
    question: string;
    options: string[];
    correct_answer: string;
}

export default function TeacherTests() {
    const { profile } = useAuth();
    const { toast } = useToast();

    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [tests, setTests] = useState<Test[]>([]);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [results, setResults] = useState<TestResult[]>([]);

    // New test form
    const [newTest, setNewTest] = useState({
        title: "",
        classId: "",
        duration: 30,
        startDate: "",
        endDate: ""
    });

    // Question form state
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQ, setCurrentQ] = useState<Question>({
        question: "",
        options: ["", "", "", ""],
        correct_answer: ""
    });

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fetchingResults, setFetchingResults] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [classesRes, testsRes] = await Promise.all([
                api.get("/api/classes/teacher"),
                api.get("/api/tests/teacher")
            ]);
            setClasses(classesRes.data.data || []);
            setTests(testsRes.data.data || []);
        } catch (err) {
            console.error("Failed to fetch data:", err);
            toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast, profile]);

    useEffect(() => {
        if (profile) fetchData();
    }, [profile, fetchData]);

    // Realtime: Listen for new test results
    useRealtime({
        table: "mcq_submissions",
        callback: () => {
            if (selectedTest) viewResults(selectedTest);
        }
    });

    const handleCreateTest = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post("/api/tests/teacher", newTest);
            toast({ title: "Test created! Now add questions." });
            setNewTest({ title: "", classId: "", duration: 30, startDate: "", endDate: "" });
            fetchData();
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.error?.message || "Failed to create test", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddQuestion = () => {
        if (!currentQ.question || !currentQ.correct_answer || currentQ.options.some(o => !o)) {
            toast({ title: "Validation Error", description: "Please fill all fields and select a correct answer.", variant: "destructive" });
            return;
        }
        setQuestions([...questions, currentQ]);
        setCurrentQ({ question: "", options: ["", "", "", ""], correct_answer: "" });
    };

    const submitQuestions = async () => {
        if (!selectedTest || questions.length === 0) return;
        setSubmitting(true);
        try {
            await api.post(`/api/tests/teacher/${selectedTest.id}/questions`, { questions });
            toast({ title: "Questions published!" });
            setQuestions([]);
            setShowQuestionForm(false);
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.error?.message });
        } finally {
            setSubmitting(false);
        }
    };

    const viewResults = async (test: Test) => {
        setSelectedTest(test);
        setFetchingResults(true);
        try {
            const res = await api.get(`/api/tests/teacher/${test.id}/results`);
            setResults(res.data.data || []);
        } catch (err) {
            toast({ title: "Error", description: "Failed to load results", variant: "destructive" });
        } finally {
            setFetchingResults(false);
        }
    };

    const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "Teacher";

    return (
        <CampusShell role="teacher" title="Weekly MCQ Tests" user={{ name: displayName, role: "Teacher" }}>
            <div className="grid gap-6 md:grid-cols-2">
                {/* Create Test Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Schedule Test</CardTitle>
                        <CardDescription>metadata for the MCQ session.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateTest} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Test Title *</label>
                                <Input
                                    placeholder="Weekly Quiz #1"
                                    value={newTest.title}
                                    onChange={e => setNewTest({ ...newTest, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Class *</label>
                                    <Select value={newTest.classId} onValueChange={val => setNewTest({ ...newTest, classId: val })}>
                                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                        <SelectContent>
                                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Duration (min) *</label>
                                    <Input
                                        type="number"
                                        value={newTest.duration}
                                        onChange={e => setNewTest({ ...newTest, duration: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Date *</label>
                                    <Input
                                        type="datetime-local"
                                        value={newTest.startDate}
                                        onChange={e => setNewTest({ ...newTest, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Date *</label>
                                    <Input
                                        type="datetime-local"
                                        value={newTest.endDate}
                                        onChange={e => setNewTest({ ...newTest, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                                Schedule Test
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Tests List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Published Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : tests.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No tests created yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {tests.map(t => (
                                    <div key={t.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold">{t.title}</h4>
                                                <p className="text-xs text-muted-foreground mb-2">{t.classes?.name} • {t.duration} mins</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => { setSelectedTest(t); setShowQuestionForm(true); }}>
                                                        <Plus className="h-3 w-3 mr-1" /> Questions
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => viewResults(t)}>
                                                        <Users className="h-3 w-3 mr-1" /> Results
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Questions Form Modal-like */}
            {showQuestionForm && selectedTest && (
                <Card className="mt-8 border-primary">
                    <CardHeader>
                        <CardTitle>Add Questions: {selectedTest.title}</CardTitle>
                        <CardDescription>Add multiple-choice questions for this test.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-muted p-4 rounded-lg space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Question Text</label>
                                <Input value={currentQ.question} onChange={e => setCurrentQ({ ...currentQ, question: e.target.value })} placeholder="What is the capital of France?" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {currentQ.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Input
                                            value={opt}
                                            onChange={e => {
                                                const newOpts = [...currentQ.options];
                                                newOpts[i] = e.target.value;
                                                setCurrentQ({ ...currentQ, options: newOpts });
                                            }}
                                            placeholder={`Option ${i + 1}`}
                                        />
                                        <input
                                            type="radio"
                                            name="correct"
                                            checked={currentQ.correct_answer === opt && opt !== ""}
                                            onChange={() => setCurrentQ({ ...currentQ, correct_answer: opt })}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button variant="secondary" onClick={handleAddQuestion} className="w-full">Add to Queue ({questions.length})</Button>
                        </div>

                        {questions.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-semibold">Queued Questions:</h4>
                                {questions.map((q, i) => (
                                    <div key={i} className="text-sm p-2 border-b flex justify-between">
                                        <span>{i + 1}. {q.question}</span>
                                        <Badge>{q.correct_answer}</Badge>
                                    </div>
                                ))}
                                <Button onClick={submitQuestions} className="w-full mt-4" disabled={submitting}>
                                    Publish {questions.length} Questions
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    <div className="p-4 border-t flex justify-end">
                        <Button variant="ghost" onClick={() => { setShowQuestionForm(false); setQuestions([]); }}>Cancel</Button>
                    </div>
                </Card>
            )}

            {/* Results Section */}
            {selectedTest && !showQuestionForm && (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Test Results: {selectedTest.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {fetchingResults ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : results.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No students have taken this test yet.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Score</TableHead>
                                        <TableHead>Submitted At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <div className="font-medium">{r.students?.name}</div>
                                                <div className="text-xs text-muted-foreground">{r.students?.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-lg">
                                                    {r.score}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{format(new Date(r.submitted_at), "PPP p")}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                    <div className="p-4 border-t flex justify-end">
                        <Button variant="ghost" onClick={() => setSelectedTest(null)}>Close</Button>
                    </div>
                </Card>
            )}
        </CampusShell>
    );
}
