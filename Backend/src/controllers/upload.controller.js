import { supabase } from "../config/supabase.js"; // Using admin client for reliable uploads often, but better to use RLS if possible. 
// Actually, for backend-mediated uploads, we can use the service role key (supabaseAdmin) to bypass RLS 
// OR use the user's JWT if we were forwarding it. 
// Here, since we are authenticating via `authMiddleware`, we can use the admin client but validate permission manually or relying on our logic.
// Let's use the standard client for now but we might need `supabaseAdmin` if we want to bypass some RLS or if specific restricted buckets.
// Ideally, we upload using the authenticated user's context, but the backend is acting as a proxy.
// It's often easier to use Admin rights in the backend and enforce Application-level permission checks.

import { supabase as supabaseClient } from "../services/supabase.service.js"; // This exports supabaseAdmin as supabase
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * POST /upload
 * Upload a file to a specific bucket
 * Body: { bucket, path } + File
 */
export const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError("No file uploaded", 400);
    }

    const { bucket, path } = req.body;
    const userId = req.user.id;

    if (!bucket) {
        throw new AppError("Bucket name is required", 400);
    }

    // Validate allowed buckets
    const allowedBuckets = ["course-materials", "assignments", "avatars"];
    if (!allowedBuckets.includes(bucket)) {
        throw new AppError("Invalid bucket", 400);
    }

    // Construct file path
    // If no path provided, default to: {userId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const filename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_"); // Sanitize
    const filePath = path ? `${path}/${filename}` : `${userId}/${timestamp}-${filename}`;

    console.log(`📤 Uploading to ${bucket}: ${filePath}`);

    const { data, error } = await supabaseClient.storage
        .from(bucket)
        .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false,
        });

    if (error) {
        console.error("❌ Supabase Storage Error:", error);
        throw new AppError(`Upload failed: ${error.message}`, 500);
    }

    // Get public URL (only works for public buckets) or signed URL
    // 'assignments' and 'course-materials' might be private.
    // We can return the path and let the frontend request a signed URL for download, 
    // OR we can return a signed URL right now if it's for immediate display.

    // For now, return the key information
    res.status(201).json({
        success: true,
        data: {
            path: data.path,
            fullPath: `${bucket}/${data.path}`,
            name: filename,
            size: req.file.size,
            type: req.file.mimetype
        },
    });
});

export default {
    uploadFile,
};
