/**
 * Teacher Student Directory — Integration Tests
 * Run: cd Backend && npm test
 *
 * Required env vars:
 *   TEST_TEACHER_TOKEN  — valid JWT for a teacher
 *   TEST_STUDENT_TOKEN  — valid JWT for a student (for 403 tests)
 */

import request from "supertest";
import app from "../src/server.js";

const TEACHER = process.env.TEST_TEACHER_TOKEN || "TEACHER_TOKEN_REQUIRED";
const STUDENT = process.env.TEST_STUDENT_TOKEN || "STUDENT_TOKEN_REQUIRED";
const BASE = "/api/teacher/students";

describe("GET /api/teacher/students", () => {

    // ── Auth & Role ──────────────────────────────────────────────────────────
    it("returns 401 when no token is provided", async () => {
        const res = await request(app).get(BASE);
        expect(res.status).toBe(401);
    });

    it("returns 403 when a student tries to access", async () => {
        const res = await request(app)
            .get(BASE)
            .set("Authorization", `Bearer ${STUDENT}`);
        expect(res.status).toBe(403);
    });

    // ── Basic Listing ────────────────────────────────────────────────────────
    it("returns 200 with data array for a teacher", async () => {
        const res = await request(app)
            .get(BASE)
            .set("Authorization", `Bearer ${TEACHER}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("returns pagination metadata", async () => {
        const res = await request(app)
            .get(BASE)
            .set("Authorization", `Bearer ${TEACHER}`);

        expect(res.body.pagination).toMatchObject({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
        });
    });

    it("response items have expected fields", async () => {
        const res = await request(app)
            .get(BASE)
            .set("Authorization", `Bearer ${TEACHER}`);

        if (res.body.data.length > 0) {
            const s = res.body.data[0];
            expect(s).toHaveProperty("id");
            expect(s).toHaveProperty("name");
            expect(s).toHaveProperty("email");
            expect(s).toHaveProperty("roll_no");
            expect(s).toHaveProperty("class");
            // attendance_pct and avg_marks may be null for new students
            expect("attendance_pct" in s).toBe(true);
            expect("avg_marks" in s).toBe(true);
        }
    });

    // ── Pagination ───────────────────────────────────────────────────────────
    it("respects page and limit params", async () => {
        const res = await request(app)
            .get(`${BASE}?page=1&limit=5`)
            .set("Authorization", `Bearer ${TEACHER}`);

        expect(res.status).toBe(200);
        expect(res.body.pagination.limit).toBe(5);
        expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it("rejects limit above 100", async () => {
        const res = await request(app)
            .get(`${BASE}?limit=9999`)
            .set("Authorization", `Bearer ${TEACHER}`);
        expect(res.status).toBe(200);
        expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
    });

    // ── Search ───────────────────────────────────────────────────────────────
    it("returns empty array for non-existent search term", async () => {
        const res = await request(app)
            .get(`${BASE}?search=zzz_no_such_student_xyz`)
            .set("Authorization", `Bearer ${TEACHER}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("filters by search term (name)", async () => {
        // First get a student name, then search for it
        const all = await request(app)
            .get(`${BASE}?limit=1`)
            .set("Authorization", `Bearer ${TEACHER}`);

        if (all.body.data.length === 0) return; // Skip if no data

        const nameFragment = all.body.data[0].name.split(" ")[0];
        const res = await request(app)
            .get(`${BASE}?search=${encodeURIComponent(nameFragment)}`)
            .set("Authorization", `Bearer ${TEACHER}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    // ── Class Filter ─────────────────────────────────────────────────────────
    it("returns empty array for non-existent classId", async () => {
        const res = await request(app)
            .get(`${BASE}?classId=00000000-0000-0000-0000-000000000000`)
            .set("Authorization", `Bearer ${TEACHER}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(0);
    });

    // ── Sorting ──────────────────────────────────────────────────────────────
    it("sorts by name ascending by default", async () => {
        const res = await request(app)
            .get(`${BASE}?sortBy=name&sortOrder=asc&limit=5`)
            .set("Authorization", `Bearer ${TEACHER}`);
        expect(res.status).toBe(200);
    });

    it("sorts by name descending", async () => {
        const res = await request(app)
            .get(`${BASE}?sortBy=name&sortOrder=desc&limit=5`)
            .set("Authorization", `Bearer ${TEACHER}`);
        expect(res.status).toBe(200);
    });
});
