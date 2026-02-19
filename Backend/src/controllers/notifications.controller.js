/**
 * Notifications Controller
 */
import { supabase } from "../config/supabase.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * Get my notifications
 * GET /api/notifications
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50); // Limit to last 50 notifications

    if (error) {
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data,
    });
});

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId) // Security: Ensure user owns notification
        .select()
        .single();

    if (error) {
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data,
    });
});

/**
 * Create notification (Internal/Admin use)
 * POST /api/notifications
 */
export const createNotification = asyncHandler(async (req, res) => {
    // Only allow if needed, triggers usually handle this
    const { userId, title, message, type, link } = req.body;

    const { data, error } = await supabase
        .from("notifications")
        .insert([{
            user_id: userId,
            title,
            message,
            type: type || 'info',
            link
        }])
        .select()
        .single();

    if (error) {
        throw new AppError(error.message, 500);
    }

    res.status(201).json({
        success: true,
        data
    });
});
