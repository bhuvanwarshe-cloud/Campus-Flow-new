import { useState, useEffect, useCallback } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import api from "@/lib/api";
import { FileText, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, Download, Upload, ExternalLink, X } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { format, isAfter } from "date-fns";

interface Assignment {
    id: string;
    title: string;
    description: string;
    deadline: string;
    classes: { name: string };
    submission: {
        id: string;
        submitted_at: string;
        status: 'on-time' | 'late';
    } | null;
}

export default function StudentAssignments() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const { notifications, markAsRead } = useNotifications();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Mark assignment notifications as read when page opens
    useEffect(() => {
        const assignmentNotifs = notifications.filter(n => !n.is_read && n.type === "assignment");
        assignmentNotifs.forEach(n => markAsRead(n.id));
    }, [notifications, markAsRead]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/assignments/student");
            setAssignments(res.data.data || []);
        } catch (err) {
            console.error("Failed to fetch assignments:", err);
            toast({ title: "Error", description: "Failed to load assignments.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (profile) fetchData();
    }, [profile, fetchData]);

    // Realtime: Listen for new assignments
    useRealtime({
        table: "assignments",
        callback: () => fetchData()
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (assignmentId: string) => {
        if (!selectedFile) {
            toast({ title: "No file selected", description: "Please choose a file to upload.", variant: "destructive" });
            return;
        }

        setUploadingId(assignmentId);
        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            await api.post(`/api/assignments/student/${assignmentId}/submit`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            toast({ title: "Assignment submitted!", description: "Your work has been uploaded successfully." });
            setSelectedFile(null);
            fetchData();
        } catch (err: any) {
            toast({ title: "Upload failed", description: err.response?.data?.error?.message || "Failed to upload file", variant: "destructive" });
        } finally {
            setUploadingId(null);
        }
    };

    const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "Student";

    const pendingAssignments = assignments.filter(a => !a.submission);
    const completedAssignments = assignments.filter(a => a.submission);

    return (
        <CampusShell role="student" title="Assignments" user={{ name: displayName, role: "Student" }}>
            <div className="space-y-8">
                {/* Pending Assignments */}
                <section>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-orange-500" /> Pending Work</h3>
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : pendingAssignments.length === 0 ? (
                        <Card className="bg-muted/50">
                            <CardContent className="py-8 text-center text-muted-foreground">
                                All caught up! No pending assignments.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {pendingAssignments.map(a => {
                                const isLate = isAfter(new Date(), new Date(a.deadline));
                                return (
                                    <Card key={a.id} className={isLate ? "border-destructive/50" : ""}>
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg">{a.title}</CardTitle>
                                                {isLate && <Badge variant="destructive">Late</Badge>}
                                            </div>
                                            <CardDescription>{a.classes?.name}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <p className="text-sm line-clamp-3">{a.description || "No description provided."}</p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                Due: {format(new Date(a.deadline), "PPP p")}
                                            </div>
                                            <div className="space-y-2 pt-2 border-t">
                                                <Input type="file" onChange={handleFileChange} />
                                                <Button
                                                    className="w-full"
                                                    disabled={uploadingId === a.id}
                                                    onClick={() => handleUpload(a.id)}
                                                >
                                                    {uploadingId === a.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                                    Submit Work
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Completed Assignments */}
                <section>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> Completed</h3>
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : completedAssignments.length === 0 ? (
                        <p className="text-muted-foreground italic">No submissions yet.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {completedAssignments.map(a => (
                                <Card key={a.id} className="bg-muted/30">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg text-muted-foreground">{a.title}</CardTitle>
                                            <Badge variant={a.submission?.status === 'on-time' ? 'secondary' : 'outline'}>
                                                {a.submission?.status}
                                            </Badge>
                                        </div>
                                        <CardDescription>{a.classes?.name}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Submitted: {format(new Date(a.submission!.submitted_at), "PPP p")}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </CampusShell>
    );
}
