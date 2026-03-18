/**
 * Admin Routes
 * Protected routes for admin-only operations
 */

import express from "express";
import { authMiddleware, ensureAdmin } from "../middleware/auth.middleware.js";
import * as adminController from "../controllers/admin.controller.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(ensureAdmin);

// Overview
// GET /api/admin/overview
router.get("/overview", adminController.getOverview);

// Users
// GET    /api/admin/users              - List users (paginated, searchable)
router.get("/users", adminController.getAllUsers);
// GET    /api/admin/users/students     - List all students (legacy endpoint)
router.get("/users/students", adminController.getAllStudents);
// GET    /api/admin/teachers     - List all approved teachers
router.get("/teachers", adminController.getAllTeachers);
// PATCH  /api/admin/users/:id/role     - Update user role
router.patch("/users/:id/role", adminController.updateUserRole);
// PATCH  /api/admin/users/:id/status   - Enable/disable user
router.patch("/users/:id/status", adminController.updateUserStatus);

// Classes
// GET /api/admin/classes
router.get("/classes", adminController.getAdminClasses);
// PATCH /api/admin/classes/:class_id/assign-class-teacher
router.patch("/classes/:class_id/assign-class-teacher", adminController.assignClassTeacher);

// Academics insights
// GET /api/admin/academics
router.get("/academics", adminController.getAcademicsOverview);

// Teacher Invitations
// POST /api/admin/invite-teacher
router.post("/invite-teacher", adminController.inviteTeacher);
// GET /api/admin/invites
router.get("/invites", adminController.listTeacherInvites);
// POST /api/admin/invites/:id/resend
router.post("/invites/:id/resend", adminController.resendTeacherInvite);

export default router;
