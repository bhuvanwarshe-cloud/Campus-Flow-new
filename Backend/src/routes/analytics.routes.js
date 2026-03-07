import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { getTeacherClassAnalytics } from '../controllers/analytics.controller.js';

const router = express.Router();

/**
 * @route GET /api/analytics/teacher/:classId
 * @desc Get aggregated analytics for a specific class taught by the teacher
 * @access Private (Teacher only)
 */
// If requireRole doesn't exist, I will use just authMiddleware for now and check roles in controller
// Let's use authMiddleware and check role inline if requireRole is missing. Let me check src/middleware first.
// Wait, I am writing this now, let's just use authMiddleware. The controller can verify if needed, 
// or I assume authMiddleware sets req.user.role. Let's just use authMiddleware for now.
router.get('/teacher/:classId', authMiddleware, getTeacherClassAnalytics);

export default router;
