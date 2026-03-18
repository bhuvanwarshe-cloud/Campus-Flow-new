import { useEffect, useState } from "react";
import { Search, Loader2, Users, Mail, Check, RotateCw, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useProfile } from "@/contexts/ProfileContext";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import api from "@/lib/api";

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

interface TeacherInvite {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

// ... logic follows ...
export default function AdminUsers() {
  const { profile } = useProfile();

  // User management state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Teacher invites state
  const [invites, setInvites] = useState<TeacherInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [submittingInvite, setSubmittingInvite] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 400);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (profile?.role !== "admin") return;

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data } = await api.get("/api/admin/users", { params: { page, limit: 20, search: search || undefined } });
        setUsers(data.data || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [profile, page, search]);

  // Fetch teacher invites
  useEffect(() => {
    if (profile?.role !== "admin") return;
    
    const fetchInvites = async () => {
      setLoadingInvites(true);
      try {
        const { data } = await api.get("/api/admin/invites");
        setInvites(data.data || []);
      } catch (err) {
        console.error("Failed to fetch invites:", err);
      } finally {
        setLoadingInvites(false);
      }
    };

    fetchInvites();
  }, [profile]);

  const onChangeRole = async (userId: string, role: string) => {
    setUpdatingUserId(userId);
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      toast.success("User role updated");
    } catch (err) {
      toast.error("Failed to update user role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const onToggleActive = async (userId: string, active: boolean) => {
    setUpdatingUserId(userId);
    try {
      await api.patch(`/api/admin/users/${userId}/status`, { isActive: active });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: active } : u));
      toast.success("User status updated");
    } catch (err) {
      toast.error("Failed to update user status");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleInviteTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setSubmittingInvite(true);
    try {
      const { data } = await api.post("/api/admin/invite-teacher", { email: inviteEmail });
      toast.success("Invitation sent successfully!");
      setInviteDialogOpen(false);
      setInviteEmail("");
      // Refresh invites list
      const { data: updated } = await api.get("/api/admin/invites");
      setInvites(updated.data || []);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || "Failed to send invitation";
      toast.error(message);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      await api.post(`/api/admin/invites/${inviteId}/resend`);
      toast.success("Invitation resent successfully!");
      // Refresh invites list
      const { data } = await api.get("/api/admin/invites");
      setInvites(data.data || []);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || "Failed to resend invitation";
      toast.error(message);
    }
  };

  return (
    <CampusShell role="admin" title="User Management" user={{ name: "Admin", role: "Admin" }}>
      <div className="space-y-6">
        <Tabs defaultValue="invites" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="invites" className="text-xs sm:text-sm">Teacher Invitations</TabsTrigger>
            <TabsTrigger value="assignment" className="text-xs sm:text-sm">Class Teacher Assignment</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Manage Users</TabsTrigger>
          </TabsList>

          <TabsContent value="invites">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Invite Teachers</CardTitle>
                <Button 
                  onClick={() => setInviteDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Invite
                </Button>
              </CardHeader>
              <CardContent>
                {loadingInvites ? (
                  <div className="text-center py-8">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : invites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No pending invitations.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">{invite.email}</TableCell>
                          <TableCell>
                            <Badge className="capitalize" variant={invite.status === "pending" ? "secondary" : "default"}>
                              {invite.status === "pending" && <RotateCw className="h-3 w-3 mr-1" />}
                              {invite.status === "accepted" && <Check className="h-3 w-3 mr-1" />}
                              {invite.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(invite.created_at), "dd MMM")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(invite.expires_at), "dd MMM, HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            {invite.status === "pending" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleResendInvite(invite.id)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <RotateCw className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignment">
            {/* Logic from AdminClasses.tsx will be moved here or we can just link to it */}
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
              <Users className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">Manage Class Assignments</h3>
              <p className="text-slate-500 text-sm max-w-md text-center mt-2 mb-6">
                Assign teachers to classes and designate class teachers to manage student enrollment requests.
              </p>
              <Button onClick={() => window.location.href = '/admin/classes'} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Go to Class Assignments
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="users">
            {/* Users Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Users</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search users..." className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                    ) : users.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>
                    ) : users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select value={user.role} onValueChange={(val) => onChangeRole(user.id, val)} disabled={updatingUserId === user.id}>
                            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="teacher">Teacher</SelectItem>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{user.is_active ? <Badge className="bg-emerald-500">Active</Badge> : <Badge variant="secondary" className="bg-orange-100 text-orange-800">Disabled</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <Switch checked={user.is_active} onCheckedChange={(c) => onToggleActive(user.id, c)} disabled={updatingUserId === user.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Teacher</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteTeacher} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Teacher Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                An invitation link will be sent to this email address
              </p>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteTeacher}
              disabled={submittingInvite}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submittingInvite ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CampusShell>
  );
}
