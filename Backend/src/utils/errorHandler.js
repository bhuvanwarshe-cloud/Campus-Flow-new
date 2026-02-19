import logger from "./logger.js";
import { config } from "../config/env.js";

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Mark as operational error (trusted)
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
  const response = {
    success: false,
    error: {
      message: err.message || "Internal Server Error",
      statusCode: err.statusCode || 500,
    },
  };

  // Only include stack trace in development
  if (config.nodeEnv === "development") {
    response.error.stack = err.stack;
  }

  return response;
};

/**
 * Handle errors in Express middleware
 * Should be the last middleware in the app
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log error using Winston
  logger.error(
    `${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
  );

  if (config.nodeEnv === "development") {
    logger.debug(err.stack);
  }

  // Make sure we're sending JSON, not HTML
  res.status(statusCode).json(formatErrorResponse(err));
};

export default {
  AppError,
  asyncHandler,
  formatErrorResponse,
  errorHandler,
};
