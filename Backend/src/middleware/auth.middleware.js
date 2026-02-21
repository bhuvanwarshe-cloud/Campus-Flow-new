/**
 * Authentication Middleware
 * 
 * Validates Supabase JWT tokens from Authorization header.
 * Uses supabaseAuth client with ANON_KEY to verify tokens via auth.getUser(token).
 * 
 * ⚠️  IMPORTANT DETAILS:
 * - Uses ANON_KEY client (supabaseAuth), NOT SERVICE_ROLE_KEY
 * - Properly validates JWT tokens from frontend
 * - Does NOT use manual JWT verification or jsonwebtoken library
 * - Works with Bearer token format: "Authorization: Bearer <token>"
 * - Attaches authenticated user to req.user
 * 
 * Usage: Apply to protected routes only
 *   router.get("/protected", authMiddleware, controllerFunction);
 * 
 * Returns 401 if:
 * - Authorization header is missing or malformed
 * - Token is invalid or expired
 * - Supabase auth.getUser() returns an error
 */

import { supabaseAuth } from "../config/supabase.js";
import supabaseService from "../services/supabase.service.js";
import { AppError } from "../utils/errorHandler.js";

/**
 * Middleware to authenticate requests using Supabase JWT tokens
 * 
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware function
 * @throws {AppError} 401 if authentication fails
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // ====================================================================
    // Step 1: Extract and validate Authorization header
    // ====================================================================
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Missing or invalid Authorization header", 401);
    }

    // ====================================================================
    // Step 2: Extract token (remove "Bearer " prefix)
    // ====================================================================
    const token = authHeader.substring(7);

    if (!token || token.trim() === "") {
      throw new AppError("Missing or invalid Authorization header", 401);
    }

    console.log("🔐 Auth Debug - Token received (first 20 chars):", token.substring(0, 20) + "...");

    // ====================================================================
    // Step 3: Verify token using Supabase AUTH client (with ANON_KEY)
    // ====================================================================
    // CRITICAL: Use supabaseAuth (ANON_KEY client) for JWT verification
    // Do NOT use supabaseAdmin (SERVICE_ROLE_KEY)
    // Do NOT use manual jwt.verify()

    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    console.log("🔐 Auth Debug - Verification result:", {
      hasUser: !!user,
      hasError: !!error,
      errorMessage: error?.message
    });

    // ====================================================================
    // Step 4: Check verification result
    // ====================================================================
    if (error || !user) {
      const errorMessage = error?.message || "Invalid or expired token";
      console.error("❌ Auth failed:", errorMessage);
      throw new AppError(errorMessage, 401);
    }

    // ====================================================================
    // Step 5: Attach authenticated user to request object
    // ====================================================================
    req.user = {
      id: user.id,
      email: user.email,
      emailConfirmed: user.email_confirmed_at,
      token: token // Attach token for RLS propagation
    };

    // ====================================================================
    // Step 6: Continue to next middleware/route handler
    // ====================================================================
    next();
  } catch (err) {
    // Handle authentication errors with proper HTTP status codes
    const statusCode = err.statusCode || 401;
    const message = err.message || "Unauthorized";

    res.status(statusCode).json({
      success: false,
      error: {
        message,
        statusCode,
      },
    });
  }
};

/**
 * ensureAdmin
 * Middleware that ensures the authenticated user has admin role.
 * Uses the shared supabaseService.getUserRole helper for consistency.
 *
 * Usage (after authMiddleware):
 *   router.use(authMiddleware);
 *   router.use(ensureAdmin);
 */
export const ensureAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError("Unauthorized", 401);
    }

    const role = await supabaseService.getUserRole(req.user.id);

    if (role !== "admin") {
      throw new AppError("Access denied. Admin only.", 403);
    }

    // Attach role for downstream handlers
    req.user.role = role;

    next();
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Failed to verify admin access";

    res.status(statusCode).json({
      success: false,
      error: {
        message,
        statusCode,
      },
    });
  }
};

export default authMiddleware;
