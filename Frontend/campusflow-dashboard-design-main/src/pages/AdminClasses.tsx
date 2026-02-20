import { useEffect, useState } from "react";
import { Users, User, Trash2, RefreshCw, Loader2, AlertCircle } from "lucide-react";

import { CampusShell } from "@/components/campusflow/CampusShell";
import { StatCard } from "@/components/campusflow/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface AdminClass {
  id: string;
  name: string;
  section?: string | null;
  created_at?: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  teachers: { id: string; name: string }[];
  enrollment_count: number;
}

export default function AdminClasses() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : "Administrator";

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/api/admin/classes");
      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to load classes");
      }
      setClasses(data.data || []);
    } catch (err: any) {
      console.error("Failed to fetch admin classes:", err);
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to load classes"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleSoftToggle = async (cls: AdminClass) => {
    // NOTE: This assumes a future PATCH /api/admin/classes/:id endpoint
    // that accepts { isDeleted: boolean }. Backend must implement it.
    const nextDeleted = !cls.is_deleted && !cls.deleted_at;
    setTogglingId(cls.id);
    try {
      await api.patch(`/api/admin/classes/${cls.id}`, {
        isDeleted: nextDeleted,
      });
      setClasses((prev) =>
        prev.map((c) =>
          c.id === cls.id
            ? {
                ...c,
                is_deleted: nextDeleted,
                deleted_at: nextDeleted ? new Date().toISOString() : null,
              }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to toggle class soft delete:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const activeClasses = classes.filter((c) => !c.is_deleted && !c.deleted_at);
  const deletedClasses = classes.filter((c) => c.is_deleted || c.deleted_at);

  return (
    <CampusShell
      role="admin"
      title="Classes & Sections"
      user={{ name: displayName, role: "Admin" }}
    >
      <div className="grid gap-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Active Classes"
            value={String(activeClasses.length)}
            hint="Available for enrollment"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Total Enrollments"
            value={String(
              classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)
            )}
            hint="Across all classes"
            tone="brand2"
            icon={<User className="h-4 w-4" />}
          />
          <StatCard
            label="Archived Classes"
            value={String(deletedClasses.length)}
            hint="Soft deleted"
            tone="default"
            icon={<Trash2 className="h-4 w-4" />}
          />
        </section>

        <section>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Classes</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchClasses}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-1.5 h-3.5 w-3.5 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Teachers</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center">
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading classes...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : classes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center">
                          <p className="text-sm text-muted-foreground">
                            No classes configured yet.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      classes.map((cls) => {
                        const isDeleted = cls.is_deleted || !!cls.deleted_at;
                        const teacherNames =
                          cls.teachers?.map((t) => t.name).join(", ") || "—";
                        return (
                          <TableRow
                            key={cls.id}
                            className={isDeleted ? "opacity-60" : ""}
                          >
                            <TableCell className="font-medium">
                              {cls.name}
                              {cls.section && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({cls.section})
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{teacherNames}</TableCell>
                            <TableCell>{cls.enrollment_count ?? 0}</TableCell>
                            <TableCell>
                              {isDeleted ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-slate-200 text-slate-800"
                                >
                                  Archived
                                </Badge>
                              ) : (
                                <Badge
                                  variant="default"
                                  className="bg-emerald-500 hover:bg-emerald-600"
                                >
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant={isDeleted ? "outline" : "destructive"}
                                size="sm"
                                className="inline-flex items-center gap-1"
                                onClick={() => handleSoftToggle(cls)}
                                disabled={togglingId === cls.id}
                              >
                                {togglingId === cls.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : isDeleted ? (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                <span className="text-xs">
                                  {isDeleted ? "Restore" : "Soft delete"}
                                </span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </CampusShell>
  );
}

