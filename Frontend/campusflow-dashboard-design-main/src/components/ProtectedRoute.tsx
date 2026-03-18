import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { session, loading } = useAuth();
    const { profile, loadingProfile } = useProfile();
    const location = useLocation();

    if (loading || loadingProfile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Not logged in → login
    if (!session) return <Navigate to="/login" replace />;

    // --- NEW ROLE APPROVAL ROUTING LOGIC ---

    const isBasicProfileComplete = profile?.isProfileComplete;

    // 1. If basic profile isn't complete (and not admin), they MUST go to /profile/complete
    if (!isBasicProfileComplete && profile?.role !== 'admin') {
        if (location.pathname !== '/profile/complete') {
            return <Navigate to="/profile/complete" replace />;
        }
        return <>{children}</>; // let them view the completion page
    }

    // 2. If their role is "pending" OR if they somehow have no role but a complete profile, they MUST go to either /role-request or /pending-approval
    if (profile?.role === 'pending' || (isBasicProfileComplete && (!profile?.role || profile.role === 'none'))) {
        // If they haven't submitted a request yet, they go to /role-request
        // We assume they've submitted a request if they try to access /pending-approval.
        // In reality, the RoleRequest page handles the internal redirection once submitted.
        if (location.pathname !== '/role-request' && location.pathname !== '/pending-approval') {
            return <Navigate to="/role-request" replace />;
        }
        return <>{children}</>;
    }

    // 3. For users with an approved role (admin, student, teacher) trying to access pending setup routes
    const roleAsAny = profile?.role as any;
    if (profile?.role && roleAsAny !== 'pending' && roleAsAny !== 'none') {
        if (location.pathname === '/profile/complete' ||
            location.pathname === '/role-request' ||
            location.pathname === '/pending-approval') {
            return <Navigate to="/dashboard" replace />;
        }
    }

    // 4. Specific role checks for restricted routes (e.g. admin-only)
    if (allowedRoles && profile?.role && roleAsAny !== 'none' && !allowedRoles.includes(profile.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
