/**
 * Notifications Routes
 */

import express from "express";
import * as notificationsController from "../controllers/notifications.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// POST /notifications - Send notification
router.post("/", notificationsController.sendNotification);

// GET /notifications/teacher - Get notifications sent by teacher
router.get("/teacher", notificationsController.getTeacherNotifications);

export default router;
