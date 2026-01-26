import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, ArrowRight, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface ClassData {
    id: string;
    name: string;
    subject_name: string; // derived from subject or internal name
    student_count: number;
    schedule: string;
    room: string;
}

export default function TeacherClasses() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const response = await api.get('/api/classes/teacher');
                setClasses(response.data.data);
            } catch (error) {
                console.error("Failed to fetch classes:", error);
            } finally {
                setLoading(false);
            }
        };

        if (profile) {
            fetchClasses();
        }
    }, [profile]);

    // Loading Skeleton
    if (loading) {
        return (
            <CampusShell
                role="teacher"
                title="My Classes"
                notifications={[]}
                user={{ name: `${profile?.firstName} ${profile?.lastName}`, role: "Teacher" }}
            >
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardHeader className="pb-4">
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CampusShell>
        );
    }

    return (
        <CampusShell
            role="teacher"
            title="My Classes"
            notifications={[]}
            user={{ name: `${profile?.firstName} ${profile?.lastName}`, role: "Teacher" }}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Assigned Classes</h2>
                        <p className="text-muted-foreground">Manage your classes, students, and curriculum.</p>
                    </div>
                </div>

                {classes.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                        <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                        <h3 className="mt-4 text-lg font-semibold">No classes assigned yet</h3>
                        <p className="text-muted-foreground">You haven't been assigned to any classes.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {classes.map((cls) => (
                            <Card key={cls.id} className="group overflow-hidden border-l-4 border-l-brand2 hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">{cls.name}</CardTitle>
                                            <CardDescription>{cls.subject_name || "General Subject"}</CardDescription>
                                        </div>
                                        <Badge variant="secondary" className="bg-brand2/10 text-brand2 hover:bg-brand2/20">
                                            Active
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-4 space-y-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Users className="h-4 w-4" />
                                        <span>{cls.student_count || 24} Students</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>{cls.schedule || "Mon, Wed, Fri • 10:00 AM"}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 flex gap-2">
                                    <Button
                                        className="w-full group-hover:bg-brand2 group-hover:text-white transition-colors"
                                        onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                                    >
                                        Manage Class <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </CampusShell>
    );
}
