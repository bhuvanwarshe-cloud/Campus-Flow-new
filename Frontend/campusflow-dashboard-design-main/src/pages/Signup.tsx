import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Lock, ArrowRight, Upload, User, Mail, Phone, MapPin, Calendar, BookOpen, Award, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";

type UserRole = "student" | "teacher";

interface SignupFormData {
    // Common fields
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    profilePhoto: File | null;

    // Role
    role: UserRole | "";

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

const BRANCHES = ["CSE", "IT", "ECE", "ME", "Civil", "EEE", "Chemical"];
const DEGREES = ["BTech", "MTech", "MBA", "BSc", "MSc", "BBA", "BCA", "MCA"];
const DEPARTMENTS = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical"];
const QUALIFICATIONS = ["BTech", "MTech", "PhD", "MSc", "MBA"];

export default function Signup() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const { user, profile } = useAuth();
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
        role: "",
    });

    useEffect(() => {
        if (user && profile) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, profile, navigate]);

    const handleInputChange = (field: keyof SignupFormData, value: string) => {
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

    const validateStep1 = () => {
        if (!formData.role) {
            toast({
                title: "Error",
                description: "Please select a role",
                variant: "destructive",
            });
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        const { email, password, confirmPassword, firstName, lastName, phone, address, dateOfBirth } = formData;

        if (!email || !password || !confirmPassword || !firstName || !lastName || !phone || !address || !dateOfBirth) {
            toast({
                title: "Error",
                description: "Please fill all required fields",
                variant: "destructive",
            });
            return false;
        }

        if (password !== confirmPassword) {
            toast({
                title: "Error",
                description: "Passwords do not match",
                variant: "destructive",
            });
            return false;
        }

        if (password.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters",
                variant: "destructive",
            });
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({
                title: "Error",
                description: "Please enter a valid email address",
                variant: "destructive",
            });
            return false;
        }

        return true;
    };

    const validateStep3 = () => {
        if (formData.role === "student") {
            if (!formData.branch || !formData.degree || !formData.registrationNumber || !formData.admissionYear) {
                toast({
                    title: "Error",
                    description: "Please fill all student-specific fields",
                    variant: "destructive",
                });
                return false;
            }
        } else if (formData.role === "teacher") {
            if (!formData.subjects || !formData.department || !formData.qualification || !formData.yearsOfExperience) {
                toast({
                    title: "Error",
                    description: "Please fill all teacher-specific fields",
                    variant: "destructive",
                });
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2 && validateStep2()) {
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
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

        if (!validateStep3()) return;

        setIsLoading(true);

        try {
            // Step 1: Create Supabase Auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("User creation failed");

            const userId = authData.user.id;

            // Step 2: Upload profile photo
            const photoUrl = await uploadProfilePhoto(userId);

            // Step 3: Create profile via backend API
            const profileData: any = {
                user_id: userId,
                email: formData.email,
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone: formData.phone,
                address: formData.address,
                date_of_birth: formData.dateOfBirth,
                profile_photo: photoUrl,
                role: formData.role,
            };

            // Add role-specific fields
            if (formData.role === "student") {
                profileData.branch = formData.branch;
                profileData.degree = formData.degree;
                profileData.registration_number = formData.registrationNumber;
                profileData.admission_year = formData.admissionYear;
            } else if (formData.role === "teacher") {
                profileData.subjects = formData.subjects;
                profileData.department = formData.department;
                profileData.qualification = formData.qualification;
                profileData.years_of_experience = parseInt(formData.yearsOfExperience || "0");
            }

            // Create profile via backend
            await api.post('/api/profile/complete', profileData);

            toast({
                title: "Success!",
                description: "Account created successfully. Please sign in.",
            });

            // Sign out the user (they need to verify email or just login again)
            await supabase.auth.signOut();

            // Redirect to login
            navigate('/login');

        } catch (error: any) {
            console.error('Signup error:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to create account. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-400/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>

            <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
                <div className="w-full max-w-4xl">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/50">
                            <GraduationCap className="h-7 w-7 text-white" />
                        </div>
                        <span className="text-3xl font-bold text-white tracking-tight">CampusFlow</span>
                    </div>

                    {/* Signup Card */}
                    <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl"></div>

                        <div className="relative">
                            {/* Header */}
                            <div className="mb-8 text-center">
                                <h2 className="text-3xl font-bold text-white mb-2">Create Your Account</h2>
                                <p className="text-purple-200/80">Join CampusFlow as a {formData.role || "student or teacher"}</p>
                            </div>

                            {/* Progress Indicator */}
                            <div className="flex items-center justify-center gap-2 mb-8">
                                {[1, 2, 3].map((s) => (
                                    <div key={s} className="flex items-center">
                                        <div className={`h-2 w-12 rounded-full transition-all ${s <= step ? 'bg-cyan-400' : 'bg-white/20'
                                            }`} />
                                        {s < 3 && <div className="w-4" />}
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Step 1: Role Selection */}
                                {step === 1 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-6">
                                            <h3 className="text-xl font-semibold text-white mb-2">Select Your Role</h3>
                                            <p className="text-purple-200/70 text-sm">Choose how you'll use CampusFlow</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => handleInputChange('role', 'student')}
                                                className={`p-6 rounded-xl border-2 transition-all ${formData.role === 'student'
                                                    ? 'border-cyan-400 bg-cyan-400/10'
                                                    : 'border-white/20 bg-white/5 hover:border-white/40'
                                                    }`}
                                            >
                                                <User className="h-12 w-12 text-cyan-300 mx-auto mb-3" />
                                                <h4 className="text-lg font-semibold text-white mb-1">Student</h4>
                                                <p className="text-sm text-purple-200/70">Access courses, marks, and progress tracking</p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleInputChange('role', 'teacher')}
                                                className={`p-6 rounded-xl border-2 transition-all ${formData.role === 'teacher'
                                                    ? 'border-cyan-400 bg-cyan-400/10'
                                                    : 'border-white/20 bg-white/5 hover:border-white/40'
                                                    }`}
                                            >
                                                <Briefcase className="h-12 w-12 text-cyan-300 mx-auto mb-3" />
                                                <h4 className="text-lg font-semibold text-white mb-1">Teacher</h4>
                                                <p className="text-sm text-purple-200/70">Manage classes, students, and assessments</p>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Basic Information */}
                                {step === 2 && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-semibold text-white mb-4">Basic Information</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName" className="text-white font-medium">First Name *</Label>
                                                <Input
                                                    id="firstName"
                                                    value={formData.firstName}
                                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                    placeholder="John"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="lastName" className="text-white font-medium">Last Name *</Label>
                                                <Input
                                                    id="lastName"
                                                    value={formData.lastName}
                                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                    placeholder="Doe"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-white font-medium">Email Address *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="name@campus.edu"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="password" className="text-white font-medium">Password *</Label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword" className="text-white font-medium">Confirm Password *</Label>
                                                <Input
                                                    id="confirmPassword"
                                                    type="password"
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-white font-medium">Phone Number *</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="+91 98765 43210"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="address" className="text-white font-medium">Address *</Label>
                                            <Input
                                                id="address"
                                                value={formData.address}
                                                onChange={(e) => handleInputChange('address', e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="123 Main St, City, State"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="dateOfBirth" className="text-white font-medium">Date of Birth *</Label>
                                            <Input
                                                id="dateOfBirth"
                                                type="date"
                                                value={formData.dateOfBirth}
                                                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="profilePhoto" className="text-white font-medium">Profile Photo (Optional)</Label>
                                            <div className="flex items-center gap-4">
                                                {photoPreview && (
                                                    <img src={photoPreview} alt="Preview" className="h-16 w-16 rounded-full object-cover border-2 border-cyan-400" />
                                                )}
                                                <label className="flex-1 cursor-pointer">
                                                    <div className="flex items-center justify-center gap-2 h-11 rounded-md bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all">
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
                                )}

                                {/* Step 3: Role-Specific Information */}
                                {step === 3 && formData.role === 'student' && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-semibold text-white mb-4">Student Information</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="branch" className="text-white font-medium">Branch *</Label>
                                                <Select value={formData.branch} onValueChange={(value) => handleInputChange('branch', value)}>
                                                    <SelectTrigger className="h-11 bg-white/10 border-white/20 text-white">
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
                                                <Label htmlFor="degree" className="text-white font-medium">Degree *</Label>
                                                <Select value={formData.degree} onValueChange={(value) => handleInputChange('degree', value)}>
                                                    <SelectTrigger className="h-11 bg-white/10 border-white/20 text-white">
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
                                            <Label htmlFor="registrationNumber" className="text-white font-medium">Registration Number *</Label>
                                            <Input
                                                id="registrationNumber"
                                                value={formData.registrationNumber}
                                                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="REG2024001"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="admissionYear" className="text-white font-medium">Admission Year *</Label>
                                            <Input
                                                id="admissionYear"
                                                type="number"
                                                value={formData.admissionYear}
                                                onChange={(e) => handleInputChange('admissionYear', e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="2024"
                                                min="2000"
                                                max="2030"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 3 && formData.role === 'teacher' && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-semibold text-white mb-4">Teacher Information</h3>

                                        <div className="space-y-2">
                                            <Label htmlFor="subjects" className="text-white font-medium">Subject(s) Taught *</Label>
                                            <Input
                                                id="subjects"
                                                value={formData.subjects}
                                                onChange={(e) => handleInputChange('subjects', e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="Mathematics, Physics"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="department" className="text-white font-medium">Department *</Label>
                                            <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                                                <SelectTrigger className="h-11 bg-white/10 border-white/20 text-white">
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
                                            <Label htmlFor="qualification" className="text-white font-medium">Qualification *</Label>
                                            <Select value={formData.qualification} onValueChange={(value) => handleInputChange('qualification', value)}>
                                                <SelectTrigger className="h-11 bg-white/10 border-white/20 text-white">
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
                                            <Label htmlFor="yearsOfExperience" className="text-white font-medium">Years of Experience *</Label>
                                            <Input
                                                id="yearsOfExperience"
                                                type="number"
                                                value={formData.yearsOfExperience}
                                                onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
                                                placeholder="5"
                                                min="0"
                                                max="50"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Navigation Buttons */}
                                <div className="flex gap-3 pt-4">
                                    {step > 1 && (
                                        <Button
                                            type="button"
                                            onClick={handleBack}
                                            variant="outline"
                                            className="flex-1 h-12 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                            disabled={isLoading}
                                        >
                                            Back
                                        </Button>
                                    )}

                                    {step < 3 ? (
                                        <Button
                                            type="button"
                                            onClick={handleNext}
                                            className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold shadow-lg shadow-cyan-500/30"
                                        >
                                            Next
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="submit"
                                            className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold shadow-lg shadow-cyan-500/30"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                                    Creating Account...
                                                </>
                                            ) : (
                                                <>
                                                    Create Account
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </form>

                            {/* Footer */}
                            <div className="mt-6 text-center">
                                <p className="text-purple-200/70 text-sm">
                                    Already have an account?{" "}
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="text-cyan-300 hover:text-cyan-200 font-medium underline-offset-4 hover:underline transition-colors"
                                    >
                                        Sign In
                                    </button>
                                </p>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/10">
                                <div className="flex items-center justify-center gap-2 text-purple-200/60 text-xs">
                                    <Lock className="h-3.5 w-3.5" />
                                    <span>Secure registration powered by Supabase</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
