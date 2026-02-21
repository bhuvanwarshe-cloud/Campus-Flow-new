import { supabase as supabaseAdmin } from "../config/supabase.js";

/**
 * Send a notification to all students enrolled in a specific class
 * 
 * @param {Object} options
 * @param {string} options.classId - The ID of the class
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification body
 * @param {string} options.type - Type of notification (assignment, test, announcement)
 * @param {string} options.link - Optional link for the frontend to navigate to
 */
export const sendClassNotification = async ({ classId, title, message, type, link }) => {
    try {
        if (!classId) return;

        // 1. Fetch all students enrolled in this class
        const { data: enrollments, error: enrollError } = await supabaseAdmin
            .from("enrollments")
            .select("student_id")
            .eq("class_id", classId);

        if (enrollError) {
            console.error("❌ Failed to fetch enrollments for notification:", enrollError.message);
            return;
        }

        if (!enrollments || enrollments.length === 0) {
            console.log(`ℹ️ No students enrolled in class ${classId}, skipping notification.`);
            return;
        }

        // 2. Prepare notifications for bulk insert
        const notifications = enrollments.map(e => ({
            user_id: e.student_id,
            title,
            message,
            type: type || 'info',
            link: link || null,
            is_read: false
        }));

        // 3. Prevent duplicate notifications (Optional logic, usually handled by checking recently sent same title/type)
        // For now, we perform a direct bulk insert.
        const { error: insertError } = await supabaseAdmin
            .from("notifications")
            .insert(notifications);

        if (insertError) {
            console.error("❌ Failed to insert bulk notifications:", insertError.message);
        } else {
            console.log(`✅ Sent ${notifications.length} notifications of type '${type}'`);
        }
    } catch (err) {
        console.error("⚠️ Unexpected error in sendClassNotification:", err.message);
    }
};

/**
 * Send a notification to a specific user
 */
export const sendUserNotification = async (userId, { title, message, type, link }) => {
    try {
        const { error } = await supabaseAdmin.from("notifications").insert([{
            user_id: userId,
            title,
            message,
            type: type || 'info',
            link: link || null,
            is_read: false
        }]);

        if (error) console.error("❌ Failed to send user notification:", error.message);
    } catch (err) {
        console.error("⚠️ Unexpected error in sendUserNotification:", err.message);
    }
};
