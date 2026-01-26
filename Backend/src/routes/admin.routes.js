/**
 * Admin Routes
 * Protected routes for admin-only operations
 */

import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import * as adminController from "../controllers/admin.controller.js";

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    // Get user role from database
    import("../services/supabase.service.js").then(({ getUserRole }) => {
        getUserRole(req.user.id).then((role) => {
            if (role !== "admin") {
                return res.status(403).json({
                    success: false,
                    error: {
                        message: "Access denied. Admin only.",
                        statusCode: 403,
                    },
                });
            }
            req.user.role = role;
            next();
        }).catch((error) => {
            return res.status(500).json({
                success: false,
                error: {
                    message: "Failed to verify admin status",
                    statusCode: 500,
                },
            });
        });
    });
};

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(isAdmin);

// GET /api/admin/users - Get all users (students + teachers)
router.get("/users", adminController.getAllUsers);

// GET /api/admin/users/students - Get all students
router.get("/users/students", adminController.getAllStudents);

// GET /api/admin/users/teachers - Get all teachers
router.get("/users/teachers", adminController.getAllTeachers);

export default router;
