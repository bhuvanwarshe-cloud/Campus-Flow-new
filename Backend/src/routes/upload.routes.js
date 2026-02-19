import express from "express";
import { uploadFile } from "../controllers/upload.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// Upload route
// POST /api/upload
// Form-data: file, bucket, path (optional)
router.post("/", authMiddleware, upload.single("file"), uploadFile);

export default router;
