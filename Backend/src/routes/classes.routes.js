/**
 * Classes Routes
 */

import express from "express";
import * as classesController from "../controllers/classes.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

// GET /classes/teacher - Get teacher's classes
router.get("/teacher", classesController.getMyClasses);

// POST /classes - Create a new class
router.post("/", classesController.createClass);

// GET /classes - List all classes
router.get("/", classesController.getClasses);

// GET /classes/:id - Get class by ID
router.get("/:id", classesController.getClassById);

// DELETE /classes/:id - Delete class
router.delete("/:id", classesController.deleteClass);

export default router;
