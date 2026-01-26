/**
 * CampusFlow Backend Server
 * Express.js server with Supabase integration
 */

import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import { errorHandler } from "./utils/errorHandler.js";
import authMiddleware from "./middleware/auth.middleware.js";
import { supabase } from "./config/supabase.js";

// Import route handlers
import rolesRoutes from "./routes/roles.routes.js";
import studentsRoutes from "./routes/students.routes.js";
import classesRoutes from "./routes/classes.routes.js";
import enrollmentsRoutes from "./routes/enrollments.routes.js";
import marksRoutes from "./routes/marks.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import profileCompletionRoutes from "./routes/profileCompletion.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";

// Initialize Express app
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Enable CORS for frontend communication
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:8080", process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "CampusFlow API is running",
    timestamp: new Date().toISOString(),
  });
});

// Test auth endpoint (with auth required)
app.get("/api/test-auth", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Authentication successful",
    userId: req.user.id,
    email: req.user.email,
  });
});

// Diagnostic endpoint to check database connectivity
app.get("/api/diagnostic", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("\n🔍 DIAGNOSTIC CHECK");
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${req.user.email}`);

    // Check 1: Can we query the roles table?
    console.log(`\n   1️⃣  Checking roles table...`);
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (roleError) {
      console.log(`      ❌ Roles query error: ${roleError.message}`);
    } else {
      console.log(`      ✅ Role found:`, roleData);
    }

    // Check 2: Can we query student_profiles table?
    console.log(`\n   2️⃣  Checking student_profiles table...`);
    const { data: studentData, error: studentError } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (studentError) {
      console.log(`      ❌ Student profiles query error: ${studentError.message} (code: ${studentError.code})`);
    } else {
      console.log(`      ✅ Student profile found:`, studentData);
    }

    // Check 3: Can we query teacher_profiles table?
    console.log(`\n   3️⃣  Checking teacher_profiles table...`);
    const { data: teacherData, error: teacherError } = await supabase
      .from("teacher_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (teacherError) {
      console.log(`      ❌ Teacher profiles query error: ${teacherError.message} (code: ${teacherError.code})`);
    } else {
      console.log(`      ✅ Teacher profile found:`, teacherData);
    }

    console.log(`\n✅ DIAGNOSTIC CHECK COMPLETE\n`);

    res.json({
      success: true,
      diagnostic: {
        userId,
        email: req.user.email,
        roleCheck: roleError ? { error: roleError.message } : { data: roleData },
        studentProfileCheck: studentError ? { error: studentError.message, code: studentError.code } : { data: studentData },
        teacherProfileCheck: teacherError ? { error: teacherError.message, code: teacherError.code } : { data: teacherData },
      }
    });
  } catch (error) {
    console.error("❌ Diagnostic error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// API status endpoint (no auth required)
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    status: "operational",
    version: "1.0.0",
  });
});

// Simple debug endpoint (no auth required)
app.get("/api/debug/config", (req, res) => {
  res.json({
    success: true,
    config: {
      supabaseUrl: config.supabaseUrl ? "✅ Set" : "❌ Missing",
      anonKey: config.supabaseAnonKey ? "✅ Set" : "❌ Missing",
      serviceRoleKey: config.supabaseServiceRoleKey ? "✅ Set" : "❌ Missing",
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// ROUTES (protected routes apply auth internally)
// ============================================

// Mount routes
// Note: Protected routes handle authentication internally via route files
app.use("/api/roles", rolesRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/enrollments", enrollmentsRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/profile-completion", profileCompletionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationsRoutes);

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: "Route not found",
      statusCode: 404,
    },
  });
});

// ============================================
// ERROR HANDLER (must be last)
// ============================================

app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

const PORT = config.port;
const NODE_ENV = config.nodeEnv;

app.listen(PORT, () => {
  console.log("🚀 CampusFlow Backend Server");
  console.log("================================");
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API Status: http://localhost:${PORT}/api/status`);
  console.log("================================");
  console.log("✅ Backend is ready!");
});

export default app;
