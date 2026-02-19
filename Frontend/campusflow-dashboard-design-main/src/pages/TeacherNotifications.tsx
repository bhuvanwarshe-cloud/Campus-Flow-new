import { useState, useEffect } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Send, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TeacherNotifications() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        api.get('/api/classes/teacher').then(res => setClasses(res.data.data || [])).catch(console.error);
    }, []);

    // Load announcement history when class changes
    useEffect(() => {
        if (!selectedClassId) return;
        api.get(`/api/teacher/announcements/${selectedClassId}`)
            .then(res => setHistory(res.data.data || []))
            .catch(console.error);
    }, [selectedClassId]);

    const handleSend = async () => {
        if (!selectedClassId || !title || !message) return;
        setSending(true);
        try {
            // Use the announcement API to broadcast to the class
            await api.post('/api/teacher/announcement', {
                classId: selectedClassId,
                title,
                body: message,
            });
            toast({ title: "Sent!", description: "Notification sent to class." });
            setTitle("");
            setMessage("");
            // Refresh history from announcements
            api.get(`/api/teacher/announcements/${selectedClassId}`)
                .then(res => setHistory(res.data.data || []))
                .catch(console.error);
        } catch (err) {
            toast({ title: "Error", description: "Failed to send.", variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    return (
        <CampusShell role="teacher" title="Notifications" user={{ name: profile?.firstName || "", role: "Teacher" }}>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Send Notification</CardTitle>
                        <CardDescription>Alert students about exams, assignments, or changes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target Class</label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Assignment Deadline" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Message</label>
                            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message here..." className="min-h-[100px]" />
                        </div>

                        <Button className="w-full" onClick={handleSend} disabled={sending}>
                            {sending ? "Sending..." : <><Send className="mr-2 h-4 w-4" /> Send Broadcast</>}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sent History</CardTitle>
                        <CardDescription>Past notifications broadcasted by you.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {history.length === 0 ? <p className="text-sm text-muted-foreground">No notifications sent yet.</p> : history.map((item) => (
                                <div key={item.id} className="p-3 border rounded-lg bg-muted/20">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-semibold text-sm">{item.title}</h4>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.message}</p>
                                    <Badge variant="outline" className="text-[10px]">{classes.find(c => c.id === item.class_id)?.name || 'Unknown Class'}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </CampusShell>
    );
}
