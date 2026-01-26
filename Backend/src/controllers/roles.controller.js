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

  if (!role) {
    throw new AppError("User role not found", 404);
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
