import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    GraduationCap, Briefcase, ArrowRight, ArrowLeft,
    CheckCircle2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const BRANCHES = ["CSE", "IT", "ECE", "ME", "Civil", "EEE", "Chemical"];
const DEGREES = ["BTech", "MTech", "MBA", "BSc", "MSc", "BBA", "BCA", "MCA"];
const DEPARTMENTS = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical"];
const QUALIFICATIONS = ["BTech", "MTech", "PhD", "MSc", "MBA"];

export default function RoleRequest() {
    const { user, loading } = useAuth();
    const { profile, loadingProfile } = useProfile();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | "">("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

    // Student fields
    const [classId, setClassId] = useState("");
    const [branch, setBranch] = useState("");
    const [degree, setDegree] = useState("");
    const [registrationNumber, setRegistrationNumber] = useState("");
    const [admissionYear, setAdmissionYear] = useState("");

    // Teacher fields
    const [subjects, setSubjects] = useState("");
    const [department, setDepartment] = useState("");
    const [qualification, setQualification] = useState("");
    const [yearsOfExperience, setYearsOfExperience] = useState("");
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

    useEffect(() => {
        if (!loading && !user) { navigate("/login", { replace: true }); return; }
        if (loading || loadingProfile) return;

        // If user already has a real role, send to dashboard
        if (profile && profile.role && profile.role !== "pending") {
            navigate("/dashboard", { replace: true });
            return;
        }

        // If profile not complete, send there first
        if (profile && !profile.isProfileComplete) {
            navigate("/profile/complete", { replace: true });
            return;
        }

        // Fetch classes for student selection
        api.get("/api/classes").then(r => {
            setClasses(r.data?.data || []);
        }).catch(() => { });
    }, [user, profile, loading, loadingProfile, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) return;

        if (selectedRole === "student") {
            if (!branch || !degree || !registrationNumber || !admissionYear || !classId) {
                toast({ title: "Error", description: "Please fill all student fields including Class", variant: "destructive" });
                return;
            }
        } else if (selectedRole === "teacher") {
            if (!subjects || !department || !qualification || !yearsOfExperience || selectedClassIds.length === 0) {
                toast({ title: "Error", description: "Please fill all teacher fields and select at least one class", variant: "destructive" });
                return;
            }
        }

        setIsSubmitting(true);
        try {
            if (selectedRole === "student") {
                await api.post("/api/student/join-request", {
                    class_id: classId || undefined,
                    branch, degree,
                    registration_number: registrationNumber,
                    admission_year: admissionYear,
                    notes: `Requested student role for ${branch} ${degree}`,
                });
            } else if (selectedRole === "teacher") {
                await api.post("/api/teacher/request", {
                    class_ids: selectedClassIds,
                    subjects, department, qualification,
                    years_of_experience: yearsOfExperience,
                    notes: `Requested teacher role for ${department}`,
                });
            }

            toast({ title: "Request Submitted!", description: selectedRole === "teacher" ? "Awaiting admin approval." : "Awaiting class teacher approval." });
            navigate("/pending-approval", { replace: true });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.response?.data?.error?.message || "Failed to submit request",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || loadingProfile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent" />
            <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
                <div className="w-full max-w-lg">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/50">
                            <GraduationCap className="h-7 w-7 text-white" />
                        </div>
                        <span className="text-3xl font-bold text-white tracking-tight">CampusFlow</span>
                    </div>

                    <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
                        {/* Header */}
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold text-white mb-1">Request Your Role</h2>
                            <p className="text-purple-200/70 text-sm">Your account is pending. Select the role you need.</p>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                            {[1, 2].map((s) => (
                                <div key={s} className={`h-2 w-16 rounded-full transition-all ${s <= step ? "bg-cyan-400" : "bg-white/20"}`} />
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Step 1: Role Selection */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <p className="text-white font-medium text-center mb-4">What will you do on CampusFlow?</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button type="button" onClick={() => setSelectedRole("student")}
                                            className={`p-6 rounded-xl border-2 transition-all text-center ${selectedRole === "student" ? "border-cyan-400 bg-cyan-400/10" : "border-white/20 bg-white/5 hover:border-white/40"}`}>
                                            <GraduationCap className="h-10 w-10 text-cyan-300 mx-auto mb-2" />
                                            <h4 className="text-base font-semibold text-white">Student</h4>
                                            <p className="text-xs text-purple-200/70 mt-1">Access courses & marks</p>
                                        </button>
                                        <button type="button" onClick={() => setSelectedRole("teacher")}
                                            className={`p-6 rounded-xl border-2 transition-all text-center ${selectedRole === "teacher" ? "border-cyan-400 bg-cyan-400/10" : "border-white/20 bg-white/5 hover:border-white/40"}`}>
                                            <Briefcase className="h-10 w-10 text-cyan-300 mx-auto mb-2" />
                                            <h4 className="text-base font-semibold text-white">Teacher</h4>
                                            <p className="text-xs text-purple-200/70 mt-1">Manage classes & assessments</p>
                                        </button>
                                    </div>
                                    <Button type="button" disabled={!selectedRole}
                                        onClick={() => setStep(2)}
                                        className="w-full h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold">
                                        Next <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {/* Step 2: Role-specific details */}
                            {step === 2 && selectedRole === "student" && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white">Student Details</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-white text-sm">Branch *</Label>
                                            <Select value={branch} onValueChange={setBranch}>
                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-white text-sm">Degree *</Label>
                                            <Select value={degree} onValueChange={setDegree}>
                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>{DEGREES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-white text-sm">Registration Number *</Label>
                                        <Input value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-purple-200/50" placeholder="REG2024001" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-white text-sm">Admission Year *</Label>
                                        <Input type="number" value={admissionYear} onChange={e => setAdmissionYear(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-purple-200/50" placeholder="2024" min="2000" max="2030" />
                                    </div>

                                    {classes.length > 0 && (
                                        <div className="space-y-1">
                                            <Label className="text-white text-sm">Class *</Label>
                                            <Select value={classId} onValueChange={setClassId}>
                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                    <SelectValue placeholder="Select class" />
                                                </SelectTrigger>
                                                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setStep(1)}
                                            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20">
                                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting}
                                            className="flex-1 h-11 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold">
                                            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Submit Request</>}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 2 && selectedRole === "teacher" && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white">Teacher Details</h3>

                                    <div className="space-y-1">
                                        <Label className="text-white text-sm">Subjects Taught *</Label>
                                        <Input value={subjects} onChange={e => setSubjects(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-purple-200/50" placeholder="Mathematics, Physics" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-white text-sm">Department *</Label>
                                            <Select value={department} onValueChange={setDepartment}>
                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-white text-sm">Qualification *</Label>
                                            <Select value={qualification} onValueChange={setQualification}>
                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>{QUALIFICATIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-white text-sm">Years of Experience *</Label>
                                        <Input type="number" value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-purple-200/50" placeholder="5" min="0" max="50" />
                                    </div>

                                    {classes.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-white text-sm">Classes You Will Teach * (Select at least one)</Label>
                                            <div className="bg-white/5 border border-white/20 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                                                {classes.map(c => (
                                                    <label key={c.id} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                                                        <input type="checkbox" checked={selectedClassIds.includes(c.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedClassIds([...selectedClassIds, c.id]);
                                                                } else {
                                                                    setSelectedClassIds(selectedClassIds.filter(id => id !== c.id));
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-white/30 accent-cyan-500" />
                                                        <span className="text-white text-sm">{c.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {selectedClassIds.length > 0 && (
                                                <p className="text-xs text-cyan-300">{selectedClassIds.length} class{selectedClassIds.length !== 1 ? 'es' : ''} selected</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setStep(1)}
                                            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20">
                                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting}
                                            className="flex-1 h-11 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold">
                                            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Submit Request</>}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    <p className="mt-4 text-center text-purple-200/50 text-xs flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" /> {selectedRole === 'teacher' ? 'Teacher requests are reviewed by the admin' : 'Student requests are reviewed by the class teacher'}
                    </p>
                </div>
            </div>
        </div>
    );
}
