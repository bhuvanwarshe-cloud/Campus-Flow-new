import { useState, useEffect } from "react";
import { Upload, Save, User as UserIcon, Mail, Phone, MapPin, Calendar, BookOpen, GraduationCap, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";

interface ProfileFormData {
    phone: string;
    address: string;
    profilePhoto: File | null;
}

export default function ProfileView() {
    const { user, profile, refreshProfile, loading, profileLoading } = useAuth();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const [formData, setFormData] = useState<ProfileFormData>({
        phone: "",
        address: "",
        profilePhoto: null,
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                phone: profile.phone || "",
                address: profile.address || "",
                profilePhoto: null,
            });
            setPhotoPreview(profile.profilePhoto || null);
        }
    }, [profile]);

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
        if (!formData.profilePhoto) return profile?.profilePhoto || null;

        try {
            const fileExt = formData.profilePhoto.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
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

    const handleSave = async () => {
        if (!user || !profile) return;
        setIsSaving(true);

        try {
            const photoUrl = await uploadProfilePhoto(user.id);

            // Only send the fields that are allowed to change
            const updateData: any = {
                phone: formData.phone,
                address: formData.address,
                profile_photo: photoUrl,
            };

            await api.put('/api/profile', updateData);

            await refreshProfile();

            setIsEditing(false);
            toast({
                title: "Success",
                description: "Profile updated successfully",
            });
        } catch (error: any) {
            console.error('Update error:', error);
            toast({
                title: "Error",
                description: "Failed to update profile",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || profileLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="container py-8 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your personal information</p>
                </div>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>}
                            Save Changes
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
                {/* Profile Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Picture</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <Avatar className="h-40 w-40 border-4 border-background shadow-xl">
                                <AvatarImage src={photoPreview || ""} />
                                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            {isEditing && (
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Upload className="h-8 w-8 text-white" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                                </label>
                            )}
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-semibold">{profile.firstName} {profile.lastName}</h2>
                            <p className="text-sm text-muted-foreground capitalize">{profile.role}</p>
                        </div>
                        <div className="w-full pt-4 border-t space-y-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span className="truncate">{profile.email}</span>
                            </div>
                            {profile.role === 'student' && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <GraduationCap className="h-4 w-4" />
                                    <span>{profile.registrationNumber}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>Update your contact details here.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input value={profile.firstName} disabled className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input value={profile.lastName} disabled className="bg-muted" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Date of Birth</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input value={profile.dateOfBirth} disabled className="pl-9 bg-muted" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={isEditing ? formData.phone : profile.phone}
                                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        disabled={!isEditing}
                                        className={!isEditing ? "pl-9 bg-muted" : "pl-9"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Address</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={isEditing ? formData.address : profile.address}
                                        onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        disabled={!isEditing}
                                        className={!isEditing ? "pl-9 bg-muted" : "pl-9"}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Academic Info - Read Only */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Academic Information</CardTitle>
                            <CardDescription>These details are managed by administration.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {profile.role === 'student' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Degree</Label>
                                            <div className="relative">
                                                <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input value={profile.degree} disabled className="pl-9 bg-muted" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Branch</Label>
                                            <div className="relative">
                                                <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input value={profile.branch} disabled className="pl-9 bg-muted" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Registration No.</Label>
                                            <Input value={profile.registrationNumber} disabled className="bg-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Admission Year</Label>
                                            <Input value={profile.admissionYear} disabled className="bg-muted" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Department</Label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input value={profile.department} disabled className="pl-9 bg-muted" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Qualification</Label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input value={profile.qualification} disabled className="pl-9 bg-muted" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Subjects Taught</Label>
                                        <Input value={profile.subjects} disabled className="bg-muted" />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
