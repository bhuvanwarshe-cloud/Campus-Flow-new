/**
 * Notifications Routes
 */

import express from "express";
import * as notificationsController from "../controllers/notifications.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// GET /api/notifications - Get all notifications for current user
router.get("/", notificationsController.getMyNotifications);

// POST /api/notifications - Create notification (manual)
router.post("/", notificationsController.createNotification);

// GET /api/notifications/teacher - Get notifications sent by/for this teacher (alias of /)
router.get("/teacher", notificationsController.getMyNotifications);

// PATCH /api/notifications/read-all - Mark all as read
router.patch("/read-all", notificationsController.markAllAsRead);

// PATCH /api/notifications/:id/read - Mark as read
router.patch("/:id/read", notificationsController.markAsRead);

export default router;
