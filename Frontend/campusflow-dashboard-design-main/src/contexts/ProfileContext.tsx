import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "@/lib/api";
import { useAuth } from "./AuthContext";

export interface UserProfile {
    id: string;
    email: string;
    role: 'admin' | 'teacher' | 'student' | 'pending' | 'none';
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    profilePhoto?: string;
    dateOfBirth?: string;
    isProfileComplete?: boolean;

    // Student specific
    branch?: string;
    degree?: string;
    registrationNumber?: string;
    admissionYear?: number;

    // Teacher specific
    subjects?: string;
    department?: string;
    qualification?: string;
    yearsOfExperience?: number;
}

interface ProfileContextType {
    profile: UserProfile | null;
    loadingProfile: boolean;
    error: string | null;
    refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
    const { user, session } = useAuth();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!user || !session?.access_token) {
            setProfile(null);
            setLoadingProfile(false);
            return;
        }

        setLoadingProfile(true);
        setError(null);

        try {
            // Get role first - CRITICAL: Must come from backend
            const roleResponse = await api.get('/api/roles/me', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const role = roleResponse.data.data.role;

            // Admins don't have deeply populated profiles in this version
            if (role === 'admin') {
                setProfile({
                    id: user.id,
                    email: user.email || '',
                    role: 'admin',
                    isProfileComplete: true,
                });
                return;
            }

            // Get profile for students and teachers
            const profileResponse = await api.get('/api/profile', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                validateStatus: (status) => status >= 200 && status < 500, // Prevent 404 console errors
            });

            if (profileResponse.status === 404) {
                setProfile({
                    id: user.id,
                    email: user.email || '',
                    role: role,
                    isProfileComplete: false,
                });
            } else {
                const profileData = profileResponse.data.data;
                const sd = profileData.roleSpecificData || {};

                setProfile({
                    id: user.id,
                    email: profileData.email || user.email || '',
                    role: role,
                    firstName: profileData.first_name,
                    lastName: profileData.last_name,
                    phone: profileData.phone,
                    address: profileData.address,
                    profilePhoto: profileData.profile_picture_url,
                    isProfileComplete: profileData.is_profile_complete,

                    ...(role === 'student' && {
                        branch: sd.branch,
                        degree: sd.degree,
                        registrationNumber: sd.registration_number,
                        admissionYear: sd.admission_year,
                    }),

                    ...(role === 'teacher' && {
                        subjects: sd.subjects_taught ? sd.subjects_taught.join(', ') : '',
                        department: sd.department,
                        qualification: sd.qualification,
                        yearsOfExperience: sd.experience_years,
                    }),
                });
            }
        } catch (err: any) {
            console.error('Error fetching profile architecture:', err);

            // Clean abstraction: don't sign out user here, just surface the UI error profile layer.
            if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
                setError('Failed to load profile data');
            }
            setProfile(null);
        } finally {
            setLoadingProfile(false);
        }
    }, [user?.id, session?.access_token]);

    useEffect(() => {
        let active = true;

        if (user?.id) {
            // Wrap in an active check internally just in case React unmounts during the dispatch
            fetchProfile().then(() => {
                if (!active) return;
            });
        } else {
            setProfile(null);
            setLoadingProfile(false);
            setError(null);
        }

        return () => {
            active = false;
        };
    }, [user?.id, fetchProfile]);

    return (
        <ProfileContext.Provider value={{ profile, loadingProfile, error, refreshProfile: fetchProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error("useProfile must be used within a ProfileProvider");
    }
    return context;
}
