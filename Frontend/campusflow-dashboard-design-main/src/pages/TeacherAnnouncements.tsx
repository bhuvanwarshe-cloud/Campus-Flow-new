import { useState, useEffect, useCallback } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import api from "@/lib/api";
import { Megaphone, Plus, Loader2, Clock } from "lucide-react";

interface ClassItem { id: string; name: string; }
interface Announcement { id: string; title: string; body: string; created_at: string; }

export default function TeacherAnnouncements() {
    const { profile } = useAuth();
    const { toast } = useToast();

    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Fetch teacher's classes
    useEffect(() => {
        if (!profile) return;
        api.get("/api/classes/teacher")
            .then(res => setClasses(res.data.data || []))
            .catch(err => console.error("Failed to fetch classes:", err));
    }, [profile]);

    // Fetch announcements when class changes
    const fetchAnnouncements = useCallback(async (classId: string) => {
        if (!classId) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/teacher/announcements/${classId}`);
            setAnnouncements(res.data.data || []);
        } catch (err) {
            console.error("Failed to fetch announcements:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClassId) fetchAnnouncements(selectedClassId);
    }, [selectedClassId, fetchAnnouncements]);

    // Realtime: refresh on new announcements
    useRealtime({
        table: "announcements",
        event: "*",
        callback: () => {
            if (selectedClassId) fetchAnnouncements(selectedClassId);
        },
    });

    const handleSubmit = async () => {
        if (!selectedClassId) {
            toast({ title: "Select a class first", variant: "destructive" });
            return;
        }
        if (!title.trim() || !body.trim()) {
            toast({ title: "Title and body are required", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            await api.post("/api/teacher/announcement", {
                classId: selectedClassId,
                title: title.trim(),
                body: body.trim(),
            });
            toast({ title: "📢 Announcement posted!", description: "All enrolled students have been notified." });
            setTitle("");
            setBody("");
            setShowForm(false);
            fetchAnnouncements(selectedClassId);
        } catch (err: any) {
            toast({ title: "Failed to post", description: err.response?.data?.error?.message || "Unknown error", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "Teacher";

    return (
        <CampusShell role="teacher" title="Announcements" user={{ name: displayName, role: "Teacher" }}>
            <div className="space-y-6">
                {/* Header Controls */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Class Announcements</CardTitle>
                                <CardDescription>Post announcements to your classes. Students are notified instantly.</CardDescription>
                            </div>
                            <Button onClick={() => setShowForm(!showForm)}>
                                <Plus className="h-4 w-4 mr-2" /> New Announcement
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Select Class</label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select class" /></SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* New Announcement Form */}
                        {showForm && (
                            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                                <h3 className="font-medium text-sm">New Announcement</h3>
                                <Input
                                    placeholder="Title (e.g. 'Exam postponed to next week')"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    maxLength={200}
                                />
                                <Textarea
                                    placeholder="Write your announcement here..."
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    rows={4}
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => { setShowForm(false); setTitle(""); setBody(""); }}>Cancel</Button>
                                    <Button onClick={handleSubmit} disabled={submitting || !selectedClassId}>
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
                                        {submitting ? "Posting..." : "Post Announcement"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Announcements List */}
                {selectedClassId && (
                    <div className="space-y-3">
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : announcements.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground">No announcements yet for this class.</p>
                                    <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
                                        Post your first announcement
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            announcements.map(a => (
                                <Card key={a.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="pt-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-base">{a.title}</h3>
                                                <p className="text-muted-foreground text-sm mt-1 whitespace-pre-wrap">{a.body}</p>
                                            </div>
                                            <Badge variant="outline" className="shrink-0 flex items-center gap-1 text-xs">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(a.created_at)}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </CampusShell>
    );
}
