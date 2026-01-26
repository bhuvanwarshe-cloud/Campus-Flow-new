import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    // If authenticated with profile, go to dashboard
    if (user && profile) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // If not authenticated, go to login
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
  }, [user, profile, loading, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render landing page - always redirect
  return null;
};

export default Index;
