import { useState, useEffect, useCallback } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import api from "@/lib/api";
import { ClipboardList, Play, Clock, CheckCircle2, AlertCircle, Loader2, Calendar } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { format, isWithinInterval, addMinutes } from "date-fns";

interface Test {
    id: string;
    title: string;
    duration: number;
    start_date: string;
    end_date: string;
    classes: { name: string };
    submission: {
        id: string;
        score: number;
        submitted_at: string;
    } | null;
}

interface Question {
    id: string;
    question: string;
    options: string[];
}

export default function StudentTests() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const { notifications, markAsRead } = useNotifications();

    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(false);

    // Active test session
    const [activeTest, setActiveTest] = useState<Test | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState<number>(0); // seconds
    const [isTakingTest, setIsTakingTest] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Mark test notifications as read when page opens
    useEffect(() => {
        const testNotifs = notifications.filter(n => !n.is_read && n.type === "test");
        testNotifs.forEach(n => markAsRead(n.id));
    }, [notifications, markAsRead]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/tests/student");
            setTests(res.data.data || []);
        } catch (err) {
            console.error("Failed to fetch tests:", err);
            toast({ title: "Error", description: "Failed to load tests.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (profile) fetchData();
    }, [profile, fetchData]);

    // Realtime: Listen for new tests
    useRealtime({
        table: "mcq_tests",
        callback: () => fetchData()
    });

    // Timer logic
    useEffect(() => {
        if (isTakingTest && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleSubmitTest(); // Auto-submit when time is up
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isTakingTest, timeLeft]);

    const startTest = async (test: Test) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/tests/student/${test.id}`);
            setQuestions(res.data.data.questions || []);
            setActiveTest(test);
            setTimeLeft(test.duration * 60);
            setIsTakingTest(true);
            setAnswers({});
        } catch (err: any) {
            toast({ title: "Cannot start test", description: err.response?.data?.error?.message || "Failed to load questions", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmitTest = async () => {
        if (!activeTest) return;
        setSubmitting(true);
        try {
            const res = await api.post(`/api/tests/student/${activeTest.id}/submit`, { answers });
            toast({ title: "Test Submitted!", description: `Score: ${res.data.data.score}/${questions.length}` });
            setIsTakingTest(false);
            setActiveTest(null);
            fetchData();
        } catch (err: any) {
            toast({ title: "Submission failed", description: err.response?.data?.error?.message });
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "Student";

    if (isTakingTest && activeTest) {
        return (
            <CampusShell role="student" title={`Test: ${activeTest.title}`} user={{ name: displayName, role: "Student" }}>
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="sticky top-4 z-10 bg-background/95 backdrop-blur p-4 border rounded-xl shadow-lg flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">{activeTest.title}</h2>
                            <p className="text-sm text-muted-foreground">{questions.length} Questions</p>
                        </div>
                        <div className={`text-2xl font-mono font-bold flex items-center gap-2 ${timeLeft < 300 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                            <Clock className="h-6 w-6" />
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <div className="space-y-8 pb-20">
                        {questions.map((q, index) => (
                            <Card key={q.id}>
                                <CardHeader>
                                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                                    <p className="text-foreground">{q.question}</p>
                                </CardHeader>
                                <CardContent>
                                    <RadioGroup value={answers[q.id]} onValueChange={(val) => handleAnswerChange(q.id, val)}>
                                        <div className="space-y-3">
                                            {q.options.map((opt, i) => (
                                                <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                                    <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                                                    <Label htmlFor={`${q.id}-${i}`} className="w-full cursor-pointer">{opt}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </RadioGroup>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-center">
                        <Button className="w-full max-w-md h-12 text-lg" disabled={submitting} onClick={handleSubmitTest}>
                            {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Submit Test"}
                        </Button>
                    </div>
                </div>
            </CampusShell>
        );
    }

    return (
        <CampusShell role="student" title="Weekly Tests" user={{ name: displayName, role: "Student" }}>
            <div className="space-y-8">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <>
                        <section>
                            <h3 className="text-xl font-bold mb-4">Available Tests</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {tests.filter(t => !t.submission).map(t => {
                                    const now = new Date();
                                    const isAvailable = isWithinInterval(now, {
                                        start: new Date(t.start_date),
                                        end: new Date(t.end_date)
                                    });
                                    const hasEnded = now > new Date(t.end_date);

                                    return (
                                        <Card key={t.id} className={isAvailable ? "border-primary/50 bg-primary/5" : ""}>
                                            <CardHeader>
                                                <div className="flex justify-between">
                                                    <CardTitle>{t.title}</CardTitle>
                                                    {isAvailable && <Badge className="bg-green-500">Live Now</Badge>}
                                                    {hasEnded && <Badge variant="secondary">Ended</Badge>}
                                                </div>
                                                <CardDescription>{t.classes?.name}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 text-sm gap-2">
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Clock className="h-3 w-3" /> {t.duration} mins
                                                    </div>
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Calendar className="h-3 w-3" /> {format(new Date(t.start_date), "MMM d, p")}
                                                    </div>
                                                </div>
                                                {!t.submission && isAvailable && (
                                                    <Button className="w-full" onClick={() => startTest(t)}>
                                                        <Play className="h-4 w-4 mr-2" /> Start Test
                                                    </Button>
                                                )}
                                                {!isAvailable && !hasEnded && !t.submission && (
                                                    <Button variant="outline" className="w-full" disabled>
                                                        Starts at {format(new Date(t.start_date), "p")}
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xl font-bold mb-4">Past Results</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {tests.filter(t => t.submission).map(t => (
                                    <Card key={t.id} className="opacity-80">
                                        <CardHeader>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <CardTitle className="text-lg">{t.title}</CardTitle>
                                                    <CardDescription>{t.classes?.name}</CardDescription>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-primary">{t.submission?.score}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Score</div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium mb-3">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Score: {t.submission.score}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </CampusShell>
    );
}
