/**
 * Role Requests Routes
 */

import express from "express";
import { authMiddleware, ensureAdmin } from "../middleware/auth.middleware.js";
import {
    submitRoleRequest,
    getMyRoleRequest,
    listRoleRequests,
    approveRoleRequest,
    rejectRoleRequest,
    countPendingRequests,
    getTeacherRoleRequests,
    approveStudentRequestAsTeacher,
    rejectStudentRequestAsTeacher,
} from "../controllers/role_requests.controller.js";

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// ─── User routes ──────────────────────────────────────────────
router.post("/", submitRoleRequest);
router.get("/me", getMyRoleRequest);

// ─── Admin routes ─────────────────────────────────────────────
router.get("/", ensureAdmin, listRoleRequests);
router.get("/count", ensureAdmin, countPendingRequests);
router.patch("/:id/approve", ensureAdmin, approveRoleRequest);
router.patch("/:id/reject", ensureAdmin, rejectRoleRequest);

// ─── Teacher routes ───────────────────────────────────────────
// ─── Teacher routes (Legacy/Internal) ─────────────────────────
// Note: Frontend should use /api/teacher/role-requests for the dashboard
router.get("/teacher", getTeacherRoleRequests);
router.patch("/teacher/:id/approve", approveStudentRequestAsTeacher);
router.patch("/teacher/:id/reject", rejectStudentRequestAsTeacher);

export default router;
