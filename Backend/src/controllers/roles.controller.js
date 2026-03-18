/**
 * Roles Controller
 * Handles user role operations
 */

import * as supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * GET /roles/me
 * Get current user's role
 */
export const getCurrentUserRole = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const role = await supabaseService.getUserRole(userId);

  // New users won't have a role row yet (before profile completion).
  // Return null gracefully so the frontend can route to /profile/complete.
  if (!role) {
    return res.json({
      success: true,
      data: {
        userId,
        role: null,
      },
    });
  }

  res.json({
    success: true,
    data: {
      userId,
      role,
    },
  });
});

export default {
  getCurrentUserRole,
};
