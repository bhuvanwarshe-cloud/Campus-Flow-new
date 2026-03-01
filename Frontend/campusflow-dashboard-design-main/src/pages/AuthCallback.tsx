import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // The session is confirmed and persisted. Now it's safe to redirect.
                navigate("/profile/complete", { replace: true });
            }
        });

        // Fallback check in case the event already fired before mount
        const verifyExistingSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (session) {
                    navigate("/profile/complete", { replace: true });
                } else if (!window.location.hash.includes('access_token')) {
                    navigate("/login", { replace: true });
                }
            } catch (err: any) {
                console.error("Auth callback error:", err);
                setError(err.message || "Authentication failed");
                setTimeout(() => navigate("/login", { replace: true }), 3000);
            }
        };

        verifyExistingSession();

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900">
            <div className="flex flex-col items-center gap-4">
                {error ? (
                    <>
                        <div className="text-red-400 font-medium">{error}</div>
                        <div className="text-purple-200/70 text-sm">Redirecting to login...</div>
                    </>
                ) : (
                    <>
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent"></div>
                        <div className="text-white font-medium text-lg animate-pulse">Signing you in...</div>
                    </>
                )}
            </div>
        </div>
    );
}
