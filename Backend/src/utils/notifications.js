import { supabaseAdmin } from "../config/supabase.js";

/**
 * Send a notification to all students enrolled in a specific class.
 *
 * @param {Object} options
 * @param {string} options.classId   - The ID of the class
 * @param {string} options.title     - Notification title
 * @param {string} options.message   - Notification body
 * @param {string} options.type      - Type: assignment | test | announcement | marks | attendance | info
 * @param {string} [options.link]    - Optional frontend navigation link
 * @param {string} [options.entityId] - Optional UUID of the triggering entity
 */
export const sendClassNotification = async ({ classId, title, message, type, link, entityId }) => {
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
            entity_id: entityId || null,
            is_read: false
        }));

        // 3. Bulk insert
        const { error: insertError } = await supabaseAdmin
            .from("notifications")
            .insert(notifications);

        if (insertError) {
            console.error("❌ Failed to insert bulk notifications:", insertError.message);
        } else {
            console.log(`✅ Sent ${notifications.length} notifications of type '${type}' to class ${classId}`);
        }
    } catch (err) {
        console.error("⚠️ Unexpected error in sendClassNotification:", err.message);
    }
};

/**
 * Send a notification to a specific user.
 *
 * @param {string} userId
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.message
 * @param {string} [payload.type]
 * @param {string} [payload.link]
 * @param {string} [payload.entityId]
 */
export const sendUserNotification = async (userId, { title, message, type, link, entityId }) => {
    try {
        const { error } = await supabaseAdmin.from("notifications").insert([{
            user_id: userId,
            title,
            message,
            type: type || 'info',
            link: link || null,
            entity_id: entityId || null,
            is_read: false
        }]);

        if (error) console.error("❌ Failed to send user notification:", error.message);
    } catch (err) {
        console.error("⚠️ Unexpected error in sendUserNotification:", err.message);
    }
};
