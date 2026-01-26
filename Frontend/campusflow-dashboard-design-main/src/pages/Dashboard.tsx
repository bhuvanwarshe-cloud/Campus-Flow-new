import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';

export default function Dashboard() {
    const { user, profile, refreshProfile, profileLoading, roleLoading } = useAuth();
    const navigate = useNavigate();

    // Trigger profile fetch when dashboard loads
    useEffect(() => {
        if (user && !profile && !profileLoading && !roleLoading) {
            refreshProfile();
        }
    }, [user, profile, profileLoading, roleLoading, refreshProfile]);

    // Show loading while role/profile is being fetched
    if (profileLoading || roleLoading || !profile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const isProfileIncomplete = (profile.role === 'student' || profile.role === 'teacher') && !profile.isProfileComplete;

    const renderDashboard = () => {
        switch (profile.role) {
            case 'admin':
                return <AdminDashboard />;
            case 'teacher':
                return <TeacherDashboard />;
            case 'student':
                return <StudentDashboard />;
            default:
                console.error('Unknown role:', profile.role);
                return (
                    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
                        <div className="w-full max-w-md p-6 bg-card rounded-lg border shadow-sm text-center">
                            <h2 className="text-xl font-bold text-destructive mb-2">Access Error</h2>
                            <p className="text-muted-foreground mb-6">
                                Your account has an unrecognized role: <span className="font-mono text-xs bg-muted px-1 rounded">{profile.role || 'Unknown'}</span>.
                                Please contact support.
                            </p>
                            <Button variant="outline" onClick={() => window.location.href = '/login'}>
                                Back to Login
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-background relative">
            {/* Profile Completion Alert Banner */}
            {isProfileIncomplete && (
                <div className="sticky top-0 z-50 w-full bg-orange-50 border-b border-orange-200 dark:bg-orange-950/30 dark:border-orange-900">
                    <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-500 shrink-0" />
                            <div className="text-sm text-orange-800 dark:text-orange-200">
                                <span className="font-semibold">Profile Incomplete:</span> Please complete your profile to unlock all features.
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-900"
                            asChild
                        >
                            <Link to="/profile/complete">
                                Complete Profile <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            )}

            {/* Main Dashboard Content */}
            {renderDashboard()}
        </div>
    );
}
