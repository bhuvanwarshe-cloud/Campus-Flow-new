/**
 * Teacher API Tests
 * Tests role enforcement, input validation, and data isolation.
 */

import request from "supertest";
import app from "../src/server.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

// These tokens must be set in environment for integration tests.
// For CI, use test accounts in Supabase.
const TEACHER_TOKEN = process.env.TEST_TEACHER_TOKEN || "";
const STUDENT_TOKEN = process.env.TEST_STUDENT_TOKEN || "";
const TEACHER_CLASS_ID = process.env.TEST_CLASS_ID || "00000000-0000-0000-0000-000000000001";

const teacherHeaders = () => ({ Authorization: `Bearer ${TEACHER_TOKEN}` });
const studentHeaders = () => ({ Authorization: `Bearer ${STUDENT_TOKEN}` });

// ── Role Enforcement ─────────────────────────────────────────────────────────

describe("Teacher API — Role Enforcement", () => {
    it("should return 401 when no token provided", async () => {
        const res = await request(app).get("/api/teacher/students");
        expect(res.statusCode).toBe(401);
    });

    it("should return 403 when student tries to access teacher endpoint", async () => {
        if (!STUDENT_TOKEN) return; // Skip if no token configured
        const res = await request(app)
            .get("/api/teacher/students")
            .set(studentHeaders());
        expect([403, 401]).toContain(res.statusCode);
    });
});

// ── GET /api/teacher/students ─────────────────────────────────────────────────

describe("GET /api/teacher/students", () => {
    it("should return paginated student list for teacher", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .get("/api/teacher/students?page=1&limit=10")
            .set(teacherHeaders());
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.page).toBe(1);
    });

    it("should support search query", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .get("/api/teacher/students?search=test")
            .set(teacherHeaders());
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

// ── POST /api/teacher/marks ───────────────────────────────────────────────────

describe("POST /api/teacher/marks", () => {
    it("should return 400 when classId is missing", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .post("/api/teacher/marks")
            .set(teacherHeaders())
            .send({ examId: "exam-1", subjectId: "sub-1", marks: [{ studentId: "s1", marksObtained: 80 }] });
        expect(res.statusCode).toBe(400);
    });

    it("should return 400 when marks array is empty", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .post("/api/teacher/marks")
            .set(teacherHeaders())
            .send({ classId: TEACHER_CLASS_ID, examId: "exam-1", subjectId: "sub-1", marks: [] });
        expect(res.statusCode).toBe(400);
    });

    it("should return 400 when marksObtained is negative", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .post("/api/teacher/marks")
            .set(teacherHeaders())
            .send({
                classId: TEACHER_CLASS_ID,
                examId: "exam-1",
                subjectId: "sub-1",
                marks: [{ studentId: "s1", marksObtained: -5 }],
            });
        expect(res.statusCode).toBe(400);
    });
});

// ── POST /api/teacher/attendance ──────────────────────────────────────────────

describe("POST /api/teacher/attendance", () => {
    it("should return 400 when classId is missing", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .post("/api/teacher/attendance")
            .set(teacherHeaders())
            .send({ attendance: [{ studentId: "s1", status: "present" }] });
        expect(res.statusCode).toBe(400);
    });

    it("should return 400 when status is invalid", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .post("/api/teacher/attendance")
            .set(teacherHeaders())
            .send({
                classId: TEACHER_CLASS_ID,
                attendance: [{ studentId: "s1", status: "maybe" }], // invalid
            });
        expect(res.statusCode).toBe(400);
    });
});

// ── POST /api/teacher/announcement ───────────────────────────────────────────

describe("POST /api/teacher/announcement", () => {
    it("should return 400 when title is missing", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .post("/api/teacher/announcement")
            .set(teacherHeaders())
            .send({ classId: TEACHER_CLASS_ID, body: "Some body" });
        expect(res.statusCode).toBe(400);
    });

    it("should return 400 when body is missing", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .post("/api/teacher/announcement")
            .set(teacherHeaders())
            .send({ classId: TEACHER_CLASS_ID, title: "Test" });
        expect(res.statusCode).toBe(400);
    });
});

// ── GET /api/teacher/exams/:classId ──────────────────────────────────────────

describe("GET /api/teacher/exams/:classId", () => {
    it("should return exams list", async () => {
        if (!TEACHER_TOKEN) return;
        const res = await request(app)
            .get(`/api/teacher/exams/${TEACHER_CLASS_ID}`)
            .set(teacherHeaders());
        expect([200, 404]).toContain(res.statusCode);
        if (res.statusCode === 200) {
            expect(Array.isArray(res.body.data)).toBe(true);
        }
    });
});
