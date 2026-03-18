import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Lock, ArrowRight, Upload, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";

interface SignupFormData {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    profilePhoto: File | null;
}

export default function Signup() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const { user } = useAuth();
    const { profile } = useProfile();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [formData, setFormData] = useState<SignupFormData>({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        dateOfBirth: "",
        profilePhoto: null,
    });

    useEffect(() => {
        if (user && profile) {
            navigate("/dashboard", { replace: true });
        }
    }, [user, profile, navigate]);

    const handleInputChange = (field: keyof SignupFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: "Error", description: "Image size must be less than 5MB", variant: "destructive" });
                return;
            }
            setFormData(prev => ({ ...prev, profilePhoto: file }));
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const validateStep1 = () => {
        const { email, password, confirmPassword } = formData;
        if (!email || !password || !confirmPassword) {
            toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
            return false;
        }
        if (password !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
            return false;
        }
        if (password.length < 6) {
            toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        const { firstName, lastName, phone, address, dateOfBirth } = formData;
        if (!firstName || !lastName || !phone || !address || !dateOfBirth) {
            toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
            return false;
        }
        return true;
    };

    const uploadProfilePhoto = async (token: string): Promise<string | null> => {
        if (!formData.profilePhoto) return null;
        try {
            const formDataUpload = new FormData();
            formDataUpload.append("avatar", formData.profilePhoto);
            const { data } = await api.post("/api/profile/avatar", formDataUpload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data.avatar_url;
        } catch {
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            if (validateStep1()) setStep(2);
            return;
        }
        if (!validateStep2()) return;

        setIsLoading(true);
        try {
            // 1. Create Supabase Auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });
            if (authError) throw authError;
            if (!authData.user || !authData.session) throw new Error("User creation failed");

            const token = authData.session.access_token;

            // 2. Optionally upload photo
            const photoUrl = await uploadProfilePhoto(token);

            // 3. Save basic profile → role will be set to 'pending' by backend
            await api.post("/api/profile/complete", {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone: formData.phone,
                address: formData.address,
                date_of_birth: formData.dateOfBirth,
                avatar_url: photoUrl,
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast({ title: "Account Created!", description: "Please select your role to continue." });

            // 4. Redirect to role request — user is still logged in
            navigate("/role-request", { replace: true });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to create account", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-400/20 via-transparent to-transparent" />

            <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
                <div className="w-full max-w-lg">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/50">
                            <GraduationCap className="h-7 w-7 text-white" />
                        </div>
                        <span className="text-3xl font-bold text-white tracking-tight">CampusFlow</span>
                    </div>

                    <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl" />
                        <div className="relative">
                            <div className="mb-6 text-center">
                                <h2 className="text-3xl font-bold text-white mb-2">Create Your Account</h2>
                                <p className="text-purple-200/80 text-sm">
                                    {step === 1 ? "Enter your account credentials" : "Tell us about yourself"}
                                </p>
                            </div>

                            {/* Progress */}
                            <div className="flex items-center justify-center gap-2 mb-8">
                                {[1, 2].map((s) => (
                                    <div key={s} className={`h-2 w-20 rounded-full transition-all ${s <= step ? "bg-cyan-400" : "bg-white/20"}`} />
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Step 1: Credentials */}
                                {step === 1 && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-white font-medium">Email Address *</Label>
                                            <Input id="email" type="email" value={formData.email}
                                                onChange={e => handleInputChange("email", e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="name@campus.edu" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="password" className="text-white font-medium">Password *</Label>
                                                <Input id="password" type="password" value={formData.password}
                                                    onChange={e => handleInputChange("password", e.target.value)}
                                                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                    placeholder="••••••••" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword" className="text-white font-medium">Confirm *</Label>
                                                <Input id="confirmPassword" type="password" value={formData.confirmPassword}
                                                    onChange={e => handleInputChange("confirmPassword", e.target.value)}
                                                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                    placeholder="••••••••" />
                                            </div>
                                        </div>
                                        <Button type="submit"
                                            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold mt-2">
                                            Next <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </>
                                )}

                                {/* Step 2: Personal info */}
                                {step === 2 && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName" className="text-white font-medium">First Name *</Label>
                                                <Input id="firstName" value={formData.firstName}
                                                    onChange={e => handleInputChange("firstName", e.target.value)}
                                                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                    placeholder="John" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastName" className="text-white font-medium">Last Name *</Label>
                                                <Input id="lastName" value={formData.lastName}
                                                    onChange={e => handleInputChange("lastName", e.target.value)}
                                                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                    placeholder="Doe" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-white font-medium">Phone *</Label>
                                            <Input id="phone" type="tel" value={formData.phone}
                                                onChange={e => handleInputChange("phone", e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="+91 98765 43210" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address" className="text-white font-medium">Address *</Label>
                                            <Input id="address" value={formData.address}
                                                onChange={e => handleInputChange("address", e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="City, State" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="dateOfBirth" className="text-white font-medium">Date of Birth *</Label>
                                            <Input id="dateOfBirth" type="date" value={formData.dateOfBirth}
                                                onChange={e => handleInputChange("dateOfBirth", e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-white font-medium">Profile Photo (Optional)</Label>
                                            <div className="flex items-center gap-4">
                                                {photoPreview && (
                                                    <img src={photoPreview} alt="Preview" className="h-14 w-14 rounded-full object-cover border-2 border-cyan-400" />
                                                )}
                                                <label className="flex-1 cursor-pointer">
                                                    <div className="flex items-center justify-center gap-2 h-11 rounded-md bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all">
                                                        <Upload className="h-4 w-4" />
                                                        <span className="text-sm">{formData.profilePhoto ? formData.profilePhoto.name : "Choose photo"}</span>
                                                    </div>
                                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setStep(1)}
                                                className="flex-1 h-12 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                                disabled={isLoading}>
                                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                            </Button>
                                            <Button type="submit" disabled={isLoading}
                                                className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold shadow-lg shadow-cyan-500/30">
                                                {isLoading ? (
                                                    <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Creating...</>
                                                ) : (
                                                    <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>
                                                )}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-purple-200/70 text-sm">
                                    Already have an account?{" "}
                                    <button onClick={() => navigate("/login")}
                                        className="text-cyan-300 hover:text-cyan-200 font-medium hover:underline underline-offset-4 transition-colors">
                                        Sign In
                                    </button>
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-purple-200/60 text-xs">
                                <Lock className="h-3.5 w-3.5" />
                                <span>Secure registration powered by Supabase</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
