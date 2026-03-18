import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, GraduationCap, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";

interface RoleRequest {
    id: string;
    requested_role: string;
    status: "pending" | "approved" | "rejected";
    notes: string | null;
    created_at: string;
    reviewed_at: string | null;
}

const STATUS_CONFIG = {
    pending: {
        icon: <Clock className="h-16 w-16 text-amber-400 animate-pulse" />,
        title: "Awaiting Approval",
        subtitle: "Your role request has been submitted. An admin will review it shortly.",
        bg: "from-amber-900/30 to-amber-800/10",
        border: "border-amber-400/30",
        badge: "bg-amber-400/20 text-amber-300 border-amber-400/30",
    },
    approved: {
        icon: <CheckCircle2 className="h-16 w-16 text-green-400" />,
        title: "Request Approved! 🎉",
        subtitle: "Your role has been approved. You can now access CampusFlow.",
        bg: "from-green-900/30 to-green-800/10",
        border: "border-green-400/30",
        badge: "bg-green-400/20 text-green-300 border-green-400/30",
    },
    rejected: {
        icon: <XCircle className="h-16 w-16 text-red-400" />,
        title: "Request Rejected",
        subtitle: "Your role request was not approved. You can submit a new request.",
        bg: "from-red-900/30 to-red-800/10",
        border: "border-red-400/30",
        badge: "bg-red-400/20 text-red-300 border-red-400/30",
    },
};

export default function PendingApproval() {
    const { user, loading } = useAuth();
    const { profile, loadingProfile, refreshProfile } = useProfile();
    const navigate = useNavigate();

    const [request, setRequest] = useState<RoleRequest | null>(null);
    const [fetching, setFetching] = useState(true);
    const [noRequest, setNoRequest] = useState(false);

    const fetchRequest = useCallback(async () => {
        try {
            // First check if they have a role request
            const { data } = await api.get("/api/role-requests/me");

            if (data.data) {
                setRequest(data.data);
                setNoRequest(false);
                // If approved, refresh profile and redirect
                if (data.data.status === "approved") {
                    await refreshProfile();
                    setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
                }
            } else {
                 setNoRequest(true);
            }
        } catch {
            setNoRequest(true);
        } finally {
            setFetching(false);
        }
    }, [navigate, refreshProfile]);

    useEffect(() => {
        if (!loading && !user) { navigate("/login", { replace: true }); return; }
        if (loading || loadingProfile) return;

        // If already a real role → dashboard
        if (profile?.role && profile.role !== "pending") {
            navigate("/dashboard", { replace: true });
            return;
        }

        fetchRequest();

        // Poll every 10 seconds
        const interval = setInterval(fetchRequest, 10000);
        return () => clearInterval(interval);
    }, [user, profile, loading, loadingProfile, fetchRequest, navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
    };

    if (loading || loadingProfile || fetching) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            </div>
        );
    }

    const cfg = request ? STATUS_CONFIG[request.status] : null;

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent" />

            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/50">
                        <GraduationCap className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-white tracking-tight">CampusFlow</span>
                </div>

                <div className="w-full max-w-md">
                    {!noRequest && cfg && request ? (
                        <div className={`rounded-2xl bg-gradient-to-b ${cfg.bg} border ${cfg.border} backdrop-blur-xl shadow-2xl p-8 text-center`}>
                            <div className="flex justify-center mb-4">{cfg.icon}</div>
                            <h2 className="text-2xl font-bold text-white mb-2">{cfg.title}</h2>
                            <p className="text-purple-200/80 text-sm mb-6">{cfg.subtitle}</p>

                            {/* Status badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-6 ${cfg.badge}`}>
                                <span className="capitalize">{request.status}</span>
                                <span>·</span>
                                <span className="capitalize">{request.requested_role} request</span>
                            </div>

                            {/* Rejection reason */}
                            {request.status === "rejected" && request.notes && (
                                <div className="mb-6 rounded-lg bg-red-400/10 border border-red-400/20 p-3 text-left">
                                    <p className="text-xs text-red-300 font-medium mb-1">Reason:</p>
                                    <p className="text-sm text-red-200">{request.notes}</p>
                                </div>
                            )}

                            {/* Submission date */}
                            <p className="text-purple-200/50 text-xs mb-6">
                                Submitted {new Date(request.created_at).toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short", year: "numeric",
                                })}
                            </p>

                            {/* Actions */}
                            <div className="space-y-3">
                                {request.status === "pending" && (
                                    <Button variant="outline" size="sm" onClick={fetchRequest}
                                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status
                                    </Button>
                                )}
                                {request.status === "rejected" && (
                                    <Button onClick={() => navigate("/role-request")}
                                        className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold">
                                        Submit New Request
                                    </Button>
                                )}
                                {request.status === "approved" && (
                                    <Button onClick={() => navigate("/dashboard")}
                                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold">
                                        Go to Dashboard
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={handleLogout}
                                    className="w-full text-purple-200/60 hover:text-white">
                                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* No request yet → redirect to role-request */
                        <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl p-8 text-center">
                            <Clock className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">No Request Found</h2>
                            <p className="text-purple-200/80 text-sm mb-6">You haven't submitted a role request yet.</p>
                            <Button onClick={() => navigate("/role-request")}
                                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold">
                                Request a Role
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full mt-3 text-purple-200/60 hover:text-white">
                                <LogOut className="mr-2 h-4 w-4" /> Sign Out
                            </Button>
                        </div>
                    )}

                    <p className="mt-6 text-center text-purple-200/40 text-xs">
                        Requests are reviewed within 24 hours · Refreshes automatically every 10s
                    </p>
                </div>
            </div>
        </div>
    );
}
