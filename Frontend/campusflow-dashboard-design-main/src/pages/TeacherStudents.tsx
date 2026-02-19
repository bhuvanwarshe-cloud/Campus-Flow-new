import { useState, useEffect, useCallback } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import {
    Search, RefreshCw, Users, ChevronLeft, ChevronRight,
    ArrowUpDown, AlertCircle, GraduationCap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Student {
    id: string;
    name: string;
    email: string;
    roll_no: string;
    class: string;
    class_id: string;
    attendance_pct: number | null;
    avg_marks: number | null;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function AttBadge({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-muted-foreground text-xs">—</span>;
    const color =
        pct >= 75 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
            pct >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
            {pct}%
        </span>
    );
}

function MarksBadge({ avg }: { avg: number | null }) {
    if (avg === null) return <span className="text-muted-foreground text-xs">—</span>;
    const color =
        avg >= 75 ? "text-green-600 dark:text-green-400" :
            avg >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                "text-red-600 dark:text-red-400";
    return <span className={`font-semibold text-sm ${color}`}>{avg}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TeacherStudents() {
    const { profile } = useAuth();

    // Data state
    const [students, setStudents] = useState<Student[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

    // Filter / sort state
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebounced] = useState("");
    const [selectedClass, setSelectedClass] = useState("all");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // ── Debounce search ──────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // ── Load classes for filter dropdown ─────────────────────────────────────
    useEffect(() => {
        api.get("/api/classes/teacher")
            .then(res => setClasses(res.data.data || []))
            .catch(() => {/* non-fatal */ });
    }, []);

    // ── Fetch students ───────────────────────────────────────────────────────
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number> = {
                page,
                limit: 20,
                sortBy,
                sortOrder,
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (selectedClass !== "all") params.classId = selectedClass;

            const res = await api.get("/api/teacher/students", { params });
            setStudents(res.data.data || []);
            setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to load students.");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, selectedClass, sortBy, sortOrder, refreshKey]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    // ── Realtime: refresh when enrollments/attendance/marks change ────────────
    useEffect(() => {
        // Polling-based refresh every 30s (realtime hook not imported here to keep it simple)
        const interval = setInterval(() => setRefreshKey(k => k + 1), 30_000);
        return () => clearInterval(interval);
    }, []);

    // ── Sort toggle ──────────────────────────────────────────────────────────
    const toggleSort = (col: string) => {
        if (sortBy === col) {
            setSortOrder(o => o === "asc" ? "desc" : "asc");
        } else {
            setSortBy(col);
            setSortOrder("asc");
        }
        setPage(1);
    };

    const SortIcon = ({ col }: { col: string }) => (
        <ArrowUpDown
            className={`h-3 w-3 ml-1 inline cursor-pointer transition-opacity ${sortBy === col ? "opacity-100" : "opacity-30"
                }`}
            onClick={() => toggleSort(col)}
        />
    );

    return (
        <CampusShell
            role="teacher"
            title="Student Directory"
            user={{ name: profile?.firstName || "Teacher", role: "Teacher" }}
        >
            <div className="space-y-5">
                {/* ── Header Stats ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Users className="h-8 w-8 text-blue-500" />
                            <div>
                                <p className="text-xs text-muted-foreground">Total Students</p>
                                <p className="text-2xl font-bold">{pagination.total}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <GraduationCap className="h-8 w-8 text-purple-500" />
                            <div>
                                <p className="text-xs text-muted-foreground">Classes</p>
                                <p className="text-2xl font-bold">{classes.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500 col-span-2 sm:col-span-1">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <span className="text-green-600 dark:text-green-400 font-bold text-sm">%</span>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Showing</p>
                                <p className="text-2xl font-bold">{students.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Filters ── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Filter &amp; Search</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="student-search"
                                    placeholder="Search by name, email or roll no…"
                                    className="pl-9"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="All Classes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setRefreshKey(k => k + 1)}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Error Banner ── */}
                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* ── Table ── */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Students</CardTitle>
                            <CardDescription>
                                {pagination.total > 0
                                    ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, pagination.total)} of ${pagination.total}`
                                    : "No students found"}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : students.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                                <Users className="h-12 w-12 opacity-30" />
                                <p className="font-medium">No students found</p>
                                <p className="text-sm">
                                    {search
                                        ? "Try a different search term or clear filters."
                                        : "Enroll students into your classes to see them here."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40">
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                                                Roll No <SortIcon col="roll_no" />
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer whitespace-nowrap"
                                                onClick={() => toggleSort("name")}
                                            >
                                                Name <SortIcon col="name" />
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer whitespace-nowrap"
                                                onClick={() => toggleSort("email")}
                                            >
                                                Email <SortIcon col="email" />
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Attendance</th>
                                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Avg Marks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((s, i) => (
                                            <tr
                                                key={s.id}
                                                className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"
                                                    }`}
                                            >
                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                                    {s.roll_no}
                                                </td>
                                                <td className="px-4 py-3 font-medium">{s.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[180px]">
                                                    {s.email}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {s.class}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <AttBadge pct={s.attendance_pct} />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <MarksBadge avg={s.avg_marks} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Pagination ── */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {page} of {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </CampusShell>
    );
}
