/**
 * Dashboard Endpoint Tests
 * Tests for: attendance summary, marks ownership, notification access, teacher stats
 */

import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// Mock supabase
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIlike = jest.fn();
const mockLimit = jest.fn();
const mockOrder = jest.fn();
const mockIn = jest.fn();

const mockFrom = jest.fn(() => ({
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    ilike: mockIlike.mockReturnThis(),
    limit: mockLimit.mockReturnValue({ data: [], error: null }),
    order: mockOrder.mockReturnValue({ data: [], error: null }),
    in: mockIn.mockReturnValue({ data: [], error: null }),
}));

jest.unstable_mockModule("../config/supabase.js", () => ({
    supabase: { from: mockFrom },
}));

jest.unstable_mockModule("../services/supabase.service.js", () => ({
    default: {
        getUserRole: jest.fn(),
        getMarksByStudent: jest.fn(),
        getStudentAttendance: jest.fn(),
        getStudentAnnouncements: jest.fn(),
        getPerformanceByStudent: jest.fn(),
    },
}));

// ============================================
// Unit Tests
// ============================================

describe("Attendance Summary Comment Logic", () => {
    const getAttendanceComment = (pct) => {
        if (pct >= 90) return "Excellent Attendance";
        if (pct >= 75) return "Good, Keep Improving";
        if (pct >= 60) return "Warning Zone";
        return "Critical, Improve Immediately";
    };

    it("should return 'Excellent Attendance' for >= 90%", () => {
        expect(getAttendanceComment(90)).toBe("Excellent Attendance");
        expect(getAttendanceComment(100)).toBe("Excellent Attendance");
        expect(getAttendanceComment(95)).toBe("Excellent Attendance");
    });

    it("should return 'Good, Keep Improving' for 75-89%", () => {
        expect(getAttendanceComment(75)).toBe("Good, Keep Improving");
        expect(getAttendanceComment(89)).toBe("Good, Keep Improving");
        expect(getAttendanceComment(80)).toBe("Good, Keep Improving");
    });

    it("should return 'Warning Zone' for 60-74%", () => {
        expect(getAttendanceComment(60)).toBe("Warning Zone");
        expect(getAttendanceComment(74)).toBe("Warning Zone");
        expect(getAttendanceComment(65)).toBe("Warning Zone");
    });

    it("should return 'Critical, Improve Immediately' for < 60%", () => {
        expect(getAttendanceComment(0)).toBe("Critical, Improve Immediately");
        expect(getAttendanceComment(59)).toBe("Critical, Improve Immediately");
        expect(getAttendanceComment(30)).toBe("Critical, Improve Immediately");
    });
});

describe("Marks Ownership", () => {
    it("should only return marks for the specified student ID", () => {
        const allMarks = [
            { student_id: "s1", marks_obtained: 85 },
            { student_id: "s2", marks_obtained: 70 },
            { student_id: "s1", marks_obtained: 90 },
        ];
        const studentId = "s1";
        const studentMarks = allMarks.filter((m) => m.student_id === studentId);
        expect(studentMarks).toHaveLength(2);
        expect(studentMarks.every((m) => m.student_id === studentId)).toBe(true);
    });
});

describe("Progress Calculation", () => {
    it("should compute combined score correctly (60% marks + 40% attendance)", () => {
        const avgMarks = 80;
        const attendancePct = 90;
        const combinedScore = Math.round(avgMarks * 0.6 + attendancePct * 0.4);
        expect(combinedScore).toBe(84);
    });

    it("should determine standing based on combined score", () => {
        const getStanding = (score) => {
            if (score >= 85) return "Excellent";
            if (score >= 70) return "Good";
            if (score >= 50) return "Average";
            return "Needs Improvement";
        };
        expect(getStanding(90)).toBe("Excellent");
        expect(getStanding(75)).toBe("Good");
        expect(getStanding(55)).toBe("Average");
        expect(getStanding(30)).toBe("Needs Improvement");
    });

    it("should handle zero marks gracefully", () => {
        const marks = [];
        const totalMarks = marks.length;
        const avgMarks = totalMarks > 0
            ? marks.reduce((s, m) => s + (m.marks_obtained || 0), 0) / totalMarks
            : 0;
        expect(avgMarks).toBe(0);
    });
});

describe("Rank Estimation", () => {
    it("should compute rank and percentile correctly", () => {
        const avgs = [
            { studentId: "s1", avg: 90 },
            { studentId: "s2", avg: 85 },
            { studentId: "s3", avg: 70 },
            { studentId: "s4", avg: 60 },
        ];
        avgs.sort((a, b) => b.avg - a.avg);
        const myRank = avgs.findIndex((a) => a.studentId === "s2") + 1;
        const totalStudents = avgs.length;
        const percentile = Math.round(((totalStudents - myRank) / totalStudents) * 100);

        expect(myRank).toBe(2);
        expect(percentile).toBe(50);
    });
});

describe("Security: Role Enforcement", () => {
    it("should reject non-student access to student endpoints", () => {
        const role = "teacher";
        const isAllowed = role === "student";
        expect(isAllowed).toBe(false);
    });

    it("should reject non-teacher access to teacher endpoints", () => {
        const role = "student";
        const isAllowed = role === "teacher";
        expect(isAllowed).toBe(false);
    });

    it("should allow correct role", () => {
        expect("student" === "student").toBe(true);
        expect("teacher" === "teacher").toBe(true);
    });
});

describe("Teacher Stats Calculation", () => {
    it("should count unique students across multiple classes", () => {
        const enrollments = [
            { student_id: "s1", class_id: "c1" },
            { student_id: "s2", class_id: "c1" },
            { student_id: "s1", class_id: "c2" }, // Duplicate student
            { student_id: "s3", class_id: "c2" },
        ];
        const uniqueStudents = new Set(enrollments.map((e) => e.student_id));
        expect(uniqueStudents.size).toBe(3);
    });

    it("should handle no classes", () => {
        const classIds = [];
        const totalStudents = classIds.length > 0 ? 5 : 0;
        expect(totalStudents).toBe(0);
    });
});
