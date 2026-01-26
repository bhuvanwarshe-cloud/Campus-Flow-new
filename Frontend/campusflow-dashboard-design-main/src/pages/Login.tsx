import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Lock, ArrowRight, BarChart3, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // If session exists, redirect to dashboard
  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      // Explicitly redirect to dashboard after successful login
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
      setIsLoading(false);
    }
    // Keep loading state until redirect happens
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900">
      {/* Gradient overlay and glow effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-400/20 via-transparent to-transparent"></div>

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left Section - Branding & Features */}
        <div className="hidden lg:flex lg:w-[58%] flex-col justify-between p-12 xl:p-16">
          {/* Logo & Brand */}
          <div>
            <div className="flex items-center gap-3 mb-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/50">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-white tracking-tight">CampusFlow</span>
            </div>

            {/* Hero Content */}
            <div className="max-w-xl space-y-6">
              <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight">
                CampusFlow
              </h1>
              <p className="text-2xl text-cyan-200 font-medium">
                Where Learning Meets Technology
              </p>
              <p className="text-lg text-purple-100/80 leading-relaxed">
                A unified campus ecosystem connecting teachers, students, marks, profiles, and academics on one modern, intelligent platform.
              </p>
            </div>

            {/* Feature List */}
            <div className="mt-12 space-y-4">
              <FeatureRow
                icon={<BarChart3 className="h-5 w-5" />}
                title="Smart Marks & Results"
                description="Intelligent tracking and real-time performance analytics"
              />
              <FeatureRow
                icon={<Users className="h-5 w-5" />}
                title="Teacher-First Dashboards"
                description="Powerful tools designed for modern educators"
              />
              <FeatureRow
                icon={<TrendingUp className="h-5 w-5" />}
                title="Student Progress Tracking"
                description="Complete visibility into academic journey"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="text-purple-200/60 text-sm">
            © 2026 CampusFlow. Empowering education through technology.
          </div>
        </div>

        {/* Right Section - Login Card */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/50">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">CampusFlow</span>
            </div>

            {/* Glassmorphic Login Card */}
            <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl"></div>

              <div className="relative">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                  <p className="text-purple-200/80">Access your personalized dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white font-medium">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@campus.edu"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50 focus:bg-white/15 focus:border-cyan-400/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50 focus:bg-white/15 focus:border-cyan-400/50 transition-all"
                    />
                  </div>

                  <Button
                    className="w-full h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl hover:shadow-cyan-500/40 group"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-purple-200/70 text-sm">
                    New to CampusFlow?{" "}
                    <button
                      onClick={() => navigate('/signup')}
                      className="text-cyan-300 hover:text-cyan-200 font-medium underline-offset-4 hover:underline transition-colors"
                    >
                      Create New Account
                    </button>
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-center gap-2 text-purple-200/60 text-xs">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Secure authentication powered by Supabase</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-cyan-400/30 transition-all cursor-pointer">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-cyan-600/20 text-cyan-300 group-hover:from-cyan-400/30 group-hover:to-cyan-600/30 transition-all">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white text-sm mb-0.5">{title}</h3>
        <p className="text-xs text-purple-200/70 leading-relaxed">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-cyan-300/50 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all shrink-0" />
    </div>
  );
}

