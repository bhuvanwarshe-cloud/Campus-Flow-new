import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface ProfileFormData {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    profilePhoto: File | null;
}

export default function ProfileComplete() {
    const { user, loading } = useAuth();
    const { profile, refreshProfile, loadingProfile } = useProfile();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const [formData, setFormData] = useState<ProfileFormData>({
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        dateOfBirth: "",
        profilePhoto: null,
    });

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { replace: true });
            return;
        }

        if (loading || loadingProfile) return;

        if (user && profile) {
            if (profile.role === 'admin') {
                navigate('/dashboard', { replace: true });
                return;
            }

            if (profile.isProfileComplete) {
                // If profile is complete, and role is pending -> send to role request or pending approval
                const roleAsAny = profile.role as any;
                if (roleAsAny === 'admin' || roleAsAny === 'teacher' || roleAsAny === 'student') {
                    navigate('/dashboard', { replace: true });
                } else {
                    // For pending, null, none, or unrecognized roles -> go to role request
                    navigate('/role-request', { replace: true });
                }
                return;
            }

            setFormData(prev => ({
                ...prev,
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                phone: profile.phone || "",
                address: profile.address || "",
            }));
        }
    }, [user, profile, loading, loadingProfile, navigate]);

    const handleInputChange = (field: keyof ProfileFormData, value: string) => {
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

    const uploadProfilePhoto = async (): Promise<string | null> => {
        if (!formData.profilePhoto) return null;
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('avatar', formData.profilePhoto);
            const { data } = await api.post('/api/profile/avatar', formDataUpload);
            return data.avatar_url;
        } catch (error) {
            toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const { firstName, lastName, phone, address, dateOfBirth } = formData;

        if (!firstName || !lastName || !phone || !address || !dateOfBirth) {
            toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        try {
            const photoUrl = await uploadProfilePhoto();

            // Sends basic profile, backend assigns 'pending' role automatically
            await api.post('/api/profile/complete', {
                first_name: firstName,
                last_name: lastName,
                phone,
                address,
                date_of_birth: dateOfBirth,
                avatar_url: photoUrl,
            });

            toast({ title: "Success!", description: "Profile saved successfully." });
            await refreshProfile();
            navigate('/role-request', { replace: true });

        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.error?.message || "Failed to complete profile",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            </div>
        );
    }

    if (!user || !profile || profile.role === 'admin' || profile.isProfileComplete) return null;

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="mx-auto max-w-3xl">
                <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-900 dark:text-orange-100">Step 1: Complete Profile</AlertTitle>
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                        Please provide basic information before requesting a role.
                    </AlertDescription>
                </Alert>

                <div className="rounded-lg border bg-card p-8 shadow-sm">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                        <p className="text-sm text-muted-foreground mt-1">Fill in the required information to get started</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input id="firstName" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name *</Label>
                                    <Input id="lastName" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="+91 98765 43210" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address *</Label>
                                <Input id="address" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} placeholder="123 Main St, City, State" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                                <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => handleInputChange('dateOfBirth', e.target.value)} required />
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="profilePhoto">Profile Photo (Optional)</Label>
                                <div className="flex items-center gap-6">
                                    <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-muted/50 bg-muted/20 flex items-center justify-center shrink-0">
                                        {photoPreview ? <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" /> : <Upload className="h-8 w-8 text-muted-foreground/50" />}
                                    </div>
                                    <label className="flex-1 cursor-pointer">
                                        <div className="flex items-center justify-center gap-2 h-10 rounded-md xl:w-1/2 border border-input bg-background px-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                                            <Upload className="h-4 w-4" />
                                            <span className="text-sm font-medium">{formData.profilePhoto ? 'Change photo' : 'Upload photo'}</span>
                                        </div>
                                        <input id="profilePhoto" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="submit" className="flex-1 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" disabled={isLoading}>
                                {isLoading ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> Saving...</> : <>Save Profile <ArrowRight className="ml-2 h-4 w-4" /></>}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
