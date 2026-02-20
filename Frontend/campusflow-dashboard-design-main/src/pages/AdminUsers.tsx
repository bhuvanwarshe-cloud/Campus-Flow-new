import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (profile?.role !== "admin") return;

      setLoading(true);
      setError(null);

      try {
        const { data } = await api.get("/api/admin/users", {
          params: {
            page,
            limit: 20,
            search: search || undefined,
          },
        });

        if (!data?.success) {
          throw new Error(data?.error?.message || "Failed to load users");
        }

        setUsers(data.data || []);
        setPagination(data.pagination || null);
      } catch (err: any) {
        console.error("Failed to fetch admin users:", err);
        setError(
          err?.response?.data?.error?.message ||
            err?.message ||
            "Failed to fetch users"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [profile, page, search]);

  const onChangeRole = async (userId: string, role: string) => {
    setUpdatingUserId(userId);
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      toast.success("User role updated");
    } catch (err: any) {
      console.error("Failed to update user role:", err);
      toast.error(
        err?.response?.data?.error?.message ||
          "Failed to update user role. Please try again."
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const onToggleActive = async (userId: string, nextActive: boolean) => {
    setUpdatingUserId(userId);
    try {
      await api.patch(`/api/admin/users/${userId}/status`, {
        isActive: nextActive,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: nextActive } : u
        )
      );
      toast.success(
        nextActive ? "User re-enabled successfully" : "User disabled"
      );
    } catch (err: any) {
      console.error("Failed to update user status:", err);
      toast.error(
        err?.response?.data?.error?.message ||
          "Failed to update user status. Please try again."
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const isLoadingRow = (userId: string) => updatingUserId === userId;

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : "Administrator";

  return (
    <CampusShell
      role="admin"
      title="User Management"
      user={{ name: displayName, role: "Admin" }}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Registered Users</h2>
            {pagination && (
              <p className="text-xs text-muted-foreground mt-1">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )}{" "}
                of {pagination.total} users
              </p>
            )}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px] text-right">
                      Active
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading users...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        <p className="text-sm text-destructive">{error}</p>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">
                          No users found. Try adjusting your search.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || "—"}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="capitalize">
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              onChangeRole(user.id, value)
                            }
                            disabled={isLoadingRow(user.id)}
                          >
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="teacher">Teacher</SelectItem>
                              <SelectItem value="student">Student</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge
                              variant="default"
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                            >
                              Disabled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={(checked) =>
                                onToggleActive(user.id, checked)
                              }
                              disabled={isLoadingRow(user.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {pagination.page} of {pagination.totalPages}
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
