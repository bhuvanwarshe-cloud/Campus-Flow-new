import multer from "multer";

// Use memory storage so we can buffer the file and upload to Supabase directly
const storage = multer.memoryStorage();

// File filter to restrict file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "text/plain",
        "application/zip"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only images, PDFs, Docs, and Spreadsheets are allowed."), false);
    }
};

// Limits (5MB)
const limits = {
    fileSize: 5 * 1024 * 1024,
};

export const upload = multer({
    storage,
    fileFilter,
    limits,
});
