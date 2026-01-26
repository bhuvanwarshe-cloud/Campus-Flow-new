/**
 * Notifications Controller
 * Handles creation and retrieval of notifications
 */

import supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * Send notification to a class
 * POST /api/notifications
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const sendNotification = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { classId, title, message } = req.body;

    if (!classId || !title || !message) {
        throw new AppError("Missing required fields", 400);
    }

    // Verify teacher access
    const isTeacher = await supabaseService.isTeacherInClass(userId, classId);
    if (!isTeacher) {
        throw new AppError("You are not assigned to this class", 403);
    }

    // Create notification
    const notification = await supabaseService.createNotification({
        class_id: classId,
        teacher_id: userId,
        title,
        message,
    });

    res.status(201).json({
        success: true,
        data: notification,
        message: "Notification sent successfully",
    });
});

/**
 * Get notifications (Teacher View)
 * GET /api/notifications/teacher
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getTeacherNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get notifications sent BY this teacher
    const notifications = await supabaseService.getNotifications({ teacherId: userId });

    res.status(200).json({
        success: true,
        data: notifications,
    });
});
