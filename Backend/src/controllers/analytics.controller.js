import { supabase } from '../config/supabase.js';

/**
 * Get class analytics for a teacher
 * @route GET /api/analytics/teacher/:classId
 */
export const getTeacherClassAnalytics = async (req, res) => {
    try {
        const { classId } = req.params;
        const teacherId = req.user.id; // From authMiddleware

        // SECURITY GUARD 1: Verify this teacher is explicitly assigned to this class
        const { data: assignmentCheck, error: authError } = await supabase
            .from('teacher_class_assignments')
            .select('id')
            .eq('teacher_id', teacherId)
            .eq('class_id', classId)
            .single();

        if (authError || !assignmentCheck) {
            return res.status(403).json({
                success: false,
                error: { message: "Forbidden. You are not assigned to teach this class." }
            });
        }

        // Call the hardened SQL RPC function
        const { data: analytics, error: rpcError } = await supabase
            .rpc('get_class_analytics_for_teacher', {
                p_class_id: classId,
                p_teacher_id: teacherId
            });

        if (rpcError) {
            console.error("RPC Error:", rpcError);
            throw rpcError;
        }

        return res.status(200).json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch class analytics' }
        });
    }
};
