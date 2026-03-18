/**
 * Teacher Invites Routes
 * Routes for invite verification and teacher profile completion
 */

import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as teacherInvitesController from "../controllers/teacherInvites.controller.js";

const router = express.Router();

// Public routes (no auth required for invite verification and completion)
// GET /api/teacher-invites/verify/:token
router.get("/verify/:token", teacherInvitesController.verifyInviteToken);

// POST /api/teacher-invites/complete
router.post("/complete", teacherInvitesController.completeTeacherProfile);

export default router;
