/**
 * Error Handler Utility
 * Provides consistent error response formatting
 */

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async route wrapper to catch errors
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Format error response
 * @param {Error} err - Error object
 * @returns {Object} Formatted error response
 */
export const formatErrorResponse = (err) => {
  return {
    success: false,
    error: {
      message: err.message,
      statusCode: err.statusCode || 500,
    },
  };
};

/**
 * Handle errors in Express middleware
 * Should be the last middleware in the app
 */
export const errorHandler = (err, req, res, next) => {
  console.error("\n❌ ERROR CAUGHT BY ERROR HANDLER");
  console.error("   Message:", err.message);
  console.error("   Status:", err.statusCode || 500);
  console.error("   Stack:", err.stack);
  console.error("   Full Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Make sure we're sending JSON, not HTML
  res.status(statusCode).json(formatErrorResponse(err));
};

export default {
  AppError,
  asyncHandler,
  formatErrorResponse,
  errorHandler,
};
