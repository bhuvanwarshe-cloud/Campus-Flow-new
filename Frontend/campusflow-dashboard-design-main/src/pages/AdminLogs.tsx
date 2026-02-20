import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource: string;
  metadata?: Record<string, any> | null;
  created_at: string;
}

interface LogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminLogs() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<LogsResponse["pagination"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : "Administrator";

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Assumes backend exposes /api/admin/logs with pagination
      const { data } = await api.get("/api/admin/logs", {
        params: { page, limit: 20 },
      });
      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to load audit logs");
      }
      const payload: LogsResponse = {
        data: data.data || [],
        pagination: data.pagination,
      };
      setLogs(payload.data);
      setPagination(payload.pagination);
    } catch (err: any) {
      console.error("Failed to fetch admin logs:", err);
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to load audit logs"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
      title="Audit Logs"
      user={{ name: displayName, role: "Admin" }}
    >
      <div className="grid gap-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">System activity</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {pagination && (
                <span>
                  Page {pagination.page} of {pagination.totalPages} ·{" "}
                  {pagination.total} events
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading logs...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">
                          No audit events recorded yet.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="text-xs">{log.actor}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.resource}
                        </TableCell>
                        <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                          {log.metadata
                            ? JSON.stringify(log.metadata)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      !pagination || page >= pagination.totalPages || loading
                    }
                    onClick={() =>
                      setPage((p) =>
                        pagination
                          ? Math.min(pagination.totalPages, p + 1)
                          : p + 1
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CampusShell>
  );
}

