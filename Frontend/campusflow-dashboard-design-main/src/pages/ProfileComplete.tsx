import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";

const BRANCHES = ["CSE", "IT", "ECE", "ME", "Civil", "EEE", "Chemical"];
const DEGREES = ["BTech", "MTech", "MBA", "BSc", "MSc", "BBA", "BCA", "MCA"];
const DEPARTMENTS = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical"];
const QUALIFICATIONS = ["BTech", "MTech", "PhD", "MSc", "MBA"];

interface ProfileFormData {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    profilePhoto: File | null;

    // Student fields
    branch?: string;
    degree?: string;
    registrationNumber?: string;
    admissionYear?: string;

    // Teacher fields
    subjects?: string;
    department?: string;
    qualification?: string;
    yearsOfExperience?: string;
}

export default function ProfileComplete() {
    const { user, profile, refreshProfile, loading, profileLoading } = useAuth();
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
        // CRITICAL: Auth check FIRST - user must be authenticated
        if (!loading && !user) {
            navigate('/login', { replace: true });
            return;
        }

        // Wait for profile to load
        if (loading || profileLoading) {
            return;
        }

        // Auth confirmed, profile loaded - now check role and completion
        if (user && profile) {
            // Admins don't have profiles
            if (profile.role === 'admin') {
                navigate('/dashboard', { replace: true });
                return;
            }

            // Profile already complete - redirect to dashboard
            if (profile.isProfileComplete) {
                navigate('/dashboard', { replace: true });
                return;
            }

            // Profile incomplete - populate form with existing data
            setFormData(prev => ({
                ...prev,
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                phone: profile.phone || "",
                address: profile.address || "",
            }));
        }
    }, [user, profile, loading, profileLoading, navigate]);

    const handleInputChange = (field: keyof ProfileFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: "Error",
                    description: "Image size must be less than 5MB",
                    variant: "destructive",
                });
                return;
            }
            setFormData(prev => ({ ...prev, profilePhoto: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadProfilePhoto = async (userId: string): Promise<string | null> => {
        if (!formData.profilePhoto) return null;

        try {
            const fileExt = formData.profilePhoto.name.split('.').pop();
            const fileName = `${userId}.${fileExt}`;
            const filePath = `profile-photos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('profile-photos')
                .upload(filePath, formData.profilePhoto, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('profile-photos')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Photo upload error:', error);
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const { firstName, lastName, phone, address, dateOfBirth } = formData;

        if (!firstName || !lastName || !phone || !address || !dateOfBirth) {
            toast({
                title: "Error",
                description: "Please fill all required fields",
                variant: "destructive",
            });
            return;
        }

        // Validate role-specific fields
        if (profile?.role === 'student') {
            if (!formData.branch || !formData.degree || !formData.registrationNumber || !formData.admissionYear) {
                toast({
                    title: "Error",
                    description: "Please fill all student-specific fields",
                    variant: "destructive",
                });
                return;
            }
        } else if (profile?.role === 'teacher') {
            if (!formData.subjects || !formData.department || !formData.qualification || !formData.yearsOfExperience) {
                toast({
                    title: "Error",
                    description: "Please fill all teacher-specific fields",
                    variant: "destructive",
                });
                return;
            }
        }

        setIsLoading(true);

        try {
            // Upload profile photo
            const photoUrl = user ? await uploadProfilePhoto(user.id) : null;

            // Update profile via backend
            const profileData: any = {
                first_name: firstName,
                last_name: lastName,
                phone,
                address,
                date_of_birth: dateOfBirth,
                profile_photo: photoUrl,
            };

            // Add role-specific fields
            if (profile?.role === 'student') {
                profileData.branch = formData.branch;
                profileData.degree = formData.degree;
                profileData.registration_number = formData.registrationNumber;
                profileData.admission_year = formData.admissionYear;
            } else if (profile?.role === 'teacher') {
                profileData.subjects = formData.subjects;
                profileData.department = formData.department;
                profileData.qualification = formData.qualification;
                profileData.years_of_experience = parseInt(formData.yearsOfExperience || "0");
            }

            await api.put('/api/profile', profileData);

            toast({
                title: "Success!",
                description: "Profile completed successfully",
            });

            // Refresh profile
            await refreshProfile();

            // Redirect to dashboard
            navigate('/dashboard', { replace: true });

        } catch (error: any) {
            console.error('Profile completion error:', error);
            toast({
                title: "Error",
                description: error.response?.data?.error?.message || "Failed to complete profile",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading while auth/profile is being checked
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render if no user, no profile, admin, or profile already complete
    if (!user || !profile || profile.role === 'admin' || profile.isProfileComplete) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="mx-auto max-w-3xl">
                {/* Alert Banner */}
                <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-900 dark:text-orange-100">Profile Incomplete</AlertTitle>
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                        Please complete your profile to access all features of CampusFlow.
                    </AlertDescription>
                </Alert>

                {/* Form Card */}
                <div className="rounded-lg border bg-card p-8 shadow-sm">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Fill in the required information to get started
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Basic Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name *</Label>
                                    <Input
                                        id="lastName"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    placeholder="+91 98765 43210"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address *</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                    placeholder="123 Main St, City, State"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                                <Input
                                    id="dateOfBirth"
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profilePhoto">Profile Photo (Optional)</Label>
                                <div className="flex items-center gap-4">
                                    {photoPreview && (
                                        <img src={photoPreview} alt="Preview" className="h-16 w-16 rounded-full object-cover border-2" />
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <div className="flex items-center justify-center gap-2 h-10 rounded-md border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground">
                                            <Upload className="h-4 w-4" />
                                            <span className="text-sm">{formData.profilePhoto ? formData.profilePhoto.name : 'Choose photo'}</span>
                                        </div>
                                        <input
                                            id="profilePhoto"
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Role-Specific Information */}
                        {profile.role === 'student' && (
                            <div className="space-y-4 border-t pt-6">
                                <h2 className="text-lg font-semibold">Student Information</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="branch">Branch *</Label>
                                        <Select value={formData.branch} onValueChange={(value) => handleInputChange('branch', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select branch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BRANCHES.map(branch => (
                                                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="degree">Degree *</Label>
                                        <Select value={formData.degree} onValueChange={(value) => handleInputChange('degree', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select degree" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DEGREES.map(degree => (
                                                    <SelectItem key={degree} value={degree}>{degree}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="registrationNumber">Registration Number *</Label>
                                    <Input
                                        id="registrationNumber"
                                        value={formData.registrationNumber}
                                        onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                                        placeholder="REG2024001"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="admissionYear">Admission Year *</Label>
                                    <Input
                                        id="admissionYear"
                                        type="number"
                                        value={formData.admissionYear}
                                        onChange={(e) => handleInputChange('admissionYear', e.target.value)}
                                        placeholder="2024"
                                        min="2000"
                                        max="2030"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {profile.role === 'teacher' && (
                            <div className="space-y-4 border-t pt-6">
                                <h2 className="text-lg font-semibold">Teacher Information</h2>

                                <div className="space-y-2">
                                    <Label htmlFor="subjects">Subject(s) Taught *</Label>
                                    <Input
                                        id="subjects"
                                        value={formData.subjects}
                                        onChange={(e) => handleInputChange('subjects', e.target.value)}
                                        placeholder="Mathematics, Physics"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="department">Department *</Label>
                                    <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DEPARTMENTS.map(dept => (
                                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="qualification">Qualification *</Label>
                                    <Select value={formData.qualification} onValueChange={(value) => handleInputChange('qualification', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select qualification" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {QUALIFICATIONS.map(qual => (
                                                <SelectItem key={qual} value={qual}>{qual}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                                    <Input
                                        id="yearsOfExperience"
                                        type="number"
                                        value={formData.yearsOfExperience}
                                        onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                                        placeholder="5"
                                        min="0"
                                        max="50"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                                        Completing Profile...
                                    </>
                                ) : (
                                    <>
                                        Complete Profile
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

