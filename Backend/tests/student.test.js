/**
 * Student API Tests
 * Tests role enforcement, data isolation, and response structure.
 */

import request from "supertest";
import app from "../src/server.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STUDENT_TOKEN = process.env.TEST_STUDENT_TOKEN || "";
const TEACHER_TOKEN = process.env.TEST_TEACHER_TOKEN || "";

const studentHeaders = () => ({ Authorization: `Bearer ${STUDENT_TOKEN}` });
const teacherHeaders = () => ({ Authorization: `Bearer ${TEACHER_TOKEN}` });

// ── Role Enforcement ─────────────────────────────────────────────────────────

describe("Student API — Role Enforcement", () => {
    it("should return 401 when no token provided", async () => {
        const res = await request(app).get("/api/student/marks");
        expect(res.statusCode).toBe(401);
    });

    it("should return 403 when teacher tries to access student endpoint", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .get("/api/student/marks")
            .set(teacherHeaders());
        expect([403, 401]).toContain(res.statusCode);
    });
});

// ── GET /api/student/marks ────────────────────────────────────────────────────

describe("GET /api/student/marks", () => {
    it("should return marks for authenticated student", async () => {
        if (!STUDENT_TOKEN) return;
        const res = await request(app)
            .get("/api/student/marks")
            .set(studentHeaders());
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.summary).toBeDefined();
        expect(typeof res.body.summary.total).toBe("number");
        expect(typeof res.body.summary.average).toBe("number");
    });
});

// ── GET /api/student/attendance ───────────────────────────────────────────────

describe("GET /api/student/attendance", () => {
    it("should return attendance for authenticated student", async () => {
        if (!STUDENT_TOKEN) return;
        const res = await request(app)
            .get("/api/student/attendance")
            .set(studentHeaders());
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.summary).toBeDefined();
        expect(typeof res.body.summary.attendancePct).toBe("number");
    });

    it("should include summary with present/absent/late counts", async () => {
        if (!STUDENT_TOKEN) return;
        const res = await request(app)
            .get("/api/student/attendance")
            .set(studentHeaders());
        if (res.statusCode === 200) {
            const { summary } = res.body;
            expect(summary.present).toBeGreaterThanOrEqual(0);
            expect(summary.absent).toBeGreaterThanOrEqual(0);
            expect(summary.late).toBeGreaterThanOrEqual(0);
        }
    });
});

// ── GET /api/student/announcements ────────────────────────────────────────────

describe("GET /api/student/announcements", () => {
    it("should return announcements for authenticated student", async () => {
        if (!STUDENT_TOKEN) return;
        const res = await request(app)
            .get("/api/student/announcements")
            .set(studentHeaders());
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(typeof res.body.count).toBe("number");
    });
});

// ── GET /api/student/performance ─────────────────────────────────────────────

describe("GET /api/student/performance", () => {
    it("should return performance reports for authenticated student", async () => {
        if (!STUDENT_TOKEN) return;
        const res = await request(app)
            .get("/api/student/performance")
            .set(studentHeaders());
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

// ── Data Isolation ────────────────────────────────────────────────────────────

describe("Student API — Data Isolation", () => {
    it("student should not be able to access teacher endpoints", async () => {
        if (!STUDENT_TOKEN) return;
        const endpoints = [
            "/api/teacher/students",
            "/api/teacher/marks",
            "/api/teacher/attendance",
        ];
        for (const endpoint of endpoints) {
            const res = await request(app)
                .get(endpoint)
                .set(studentHeaders());
            expect([403, 401, 404]).toContain(res.statusCode);
        }
    });
});
