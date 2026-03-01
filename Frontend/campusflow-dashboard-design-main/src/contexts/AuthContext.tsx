import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

type UserRole = 'admin' | 'teacher' | 'student';

interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
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
    admissionYear?: string;

    // Teacher specific
    subjects?: string;
    department?: string;
    qualification?: string;
    yearsOfExperience?: number;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean; // Only for initial auth check
    profileLoading: boolean; // For profile/role fetch
    roleLoading: boolean; // For role fetch specifically
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true); // Initial auth check only
    const [profileLoading, setProfileLoading] = useState(false);
    const [roleLoading, setRoleLoading] = useState(false);

    const fetchProfile = async (userId: string) => {
        try {
            setProfileLoading(true);
            setRoleLoading(true);

            // Get role first - CRITICAL: Must come from backend
            const roleResponse = await api.get('/api/roles/me');
            const role = roleResponse.data.data.role;
            setRoleLoading(false);

            // Admins don't have profiles
            if (role === 'admin') {
                setProfile({
                    id: userId,
                    email: user?.email || '',
                    role: 'admin',
                    isProfileComplete: true,
                });
                setProfileLoading(false);
                return;
            }

            // Get profile for students and teachers
            try {
                const profileResponse = await api.get('/api/profile', {
                    validateStatus: (status) => status >= 200 && status < 500, // Prevent 404 console errors
                });

                if (profileResponse.status === 404) {
                    console.log('Profile not found - redirecting to setup');
                    setProfile({
                        id: userId,
                        email: user?.email || '',
                        role: role,
                        isProfileComplete: false,
                    });
                } else {
                    const profileData = profileResponse.data.data;

                    const sd = profileData.roleSpecificData || {};

                    setProfile({
                        id: userId,
                        email: profileData.email || user?.email || '',
                        role: role,
                        firstName: profileData.first_name,
                        lastName: profileData.last_name,
                        phone: profileData.phone,
                        address: profileData.address,
                        profilePhoto: profileData.profile_picture_url,
                        isProfileComplete: profileData.is_profile_complete,

                        // Map Student Specific Data
                        ...(role === 'student' && {
                            branch: sd.branch,
                            degree: sd.degree,
                            registrationNumber: sd.registration_number,
                            admissionYear: sd.admission_year,
                        }),

                        // Map Teacher Specific Data
                        ...(role === 'teacher' && {
                            subjects: sd.subjects_taught ? sd.subjects_taught.join(', ') : '',
                            department: sd.department,
                            qualification: sd.qualification,
                            yearsOfExperience: sd.experience_years,
                        }),
                    });
                }
            } catch (profileError: any) {
                console.error('Unexpected profile error:', profileError);
                throw profileError;
            }
            setProfileLoading(false);
        } catch (error: any) {
            console.error('Error fetching profile:', error);

            // If role fetch fails, we cannot proceed - throw error
            if (error.response?.config?.url?.includes('/roles/me')) {
                console.error('Critical: Cannot fetch user role');
                setRoleLoading(false);
                // Sign out user if we can't determine their role
                await supabase.auth.signOut();
                setProfile(null);
                setProfileLoading(false);
                return;
            }

            // Handle other unexpected errors
            setProfileLoading(false);
            setRoleLoading(false);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        // Get initial session - only check auth, don't fetch profile yet
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            // Mark auth loading as complete (session check done)
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            // Clear profile on sign out or session change
            if (!session?.user) {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setProfile(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                profile,
                loading, // Initial auth check only
                profileLoading,
                roleLoading,
                signIn,
                signUp,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
