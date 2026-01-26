/**
 * Roles Routes
 */

import express from "express";
import * as rolesController from "../controllers/roles.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /roles/me - Get current user's role
router.get("/me", rolesController.getCurrentUserRole);

export default router;
