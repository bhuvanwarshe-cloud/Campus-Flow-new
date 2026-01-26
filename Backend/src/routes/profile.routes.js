/**
 * Profile Routes
 * Routes for user profile management (student & teacher only)
 */

import express from "express";
import multer from "multer";
import {
  getMyProfile,
  upsertProfile,
  completeProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  updateStudentProfile,
  updateTeacherProfile,
} from "../controllers/profile.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Public route for signup profile completion (no auth required)
router.post("/complete", completeProfile);

// Apply auth middleware to all routes below
router.use(authMiddleware);

// Get current user's profile
router.get("/me", getMyProfile);
router.get("/", getMyProfile);

// Create/Update profile
router.post("/", upsertProfile);
router.put("/", upsertProfile);

// Upload profile photo
router.post("/photo", upload.single("photo"), uploadProfilePhoto);

// Delete profile photo
router.delete("/photo", deleteProfilePhoto);

// Update student-specific profile
router.put("/student", updateStudentProfile);

// Update teacher-specific profile
router.put("/teacher", updateTeacherProfile);

export default router;
