import { useEffect, useState } from "react";
import { Megaphone, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export default function AdminAnnouncements() {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : "Administrator";

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      // Assumes backend provides global admin announcements
      const { data } = await api.get("/api/admin/announcements");
      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to load announcements");
      }
      setAnnouncements(data.data || []);
    } catch (err: any) {
      console.error("Failed to fetch admin announcements:", err);
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to load announcements"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSubmitting(true);
    try {
      // Assumes backend endpoint for global admin announcements
      const { data } = await api.post("/api/admin/announcements", {
        title: title.trim(),
        body: body.trim(),
      });
      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to create announcement");
      }
      toast.success("Announcement sent to all users");
      setTitle("");
      setBody("");
      await fetchAnnouncements();
    } catch (err: any) {
      console.error("Failed to create admin announcement:", err);
      toast.error(
        err?.response?.data?.error?.message ||
          "Failed to send announcement. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <CampusShell
      role="admin"
      title="Global Announcements"
      user={{ name: displayName, role: "Admin" }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4" />
                Broadcast to campus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Title<span className="ml-0.5 text-destructive">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Exam schedule update, campus closure, ..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Message<span className="ml-0.5 text-destructive">*</span>
                  </label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write a clear, concise announcement that will be visible to all affected users."
                    rows={5}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    This will be delivered as a global announcement to all
                    relevant users.
                  </span>
                  <Button type="submit" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send announcement
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{typeof error === "string" ? error : "An error occurred"}</span>
            </div>
          )}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Recent broadcasts
                <Badge variant="outline" className="text-[10px]">
                  Global
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading announcements...
                </div>
              ) : announcements.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No global announcements have been sent yet.
                </p>
              ) : (
                announcements.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border bg-muted/40 p-3 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">
                        {a.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">
                      {a.body}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </CampusShell>
  );
}

