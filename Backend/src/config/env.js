import dotenv from "dotenv";

dotenv.config();

export const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  port: process.env.PORT || 5100,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-key",
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  appUrl: process.env.APP_URL || "http://localhost:5173",
  frontendUrl: process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173",
};

// Validate required environment variables
const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(
      `⚠️  Warning: ${envVar} is not set. Set it in your .env file.`
    );
  }
});

// Warn if Gmail credentials are missing
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn(
    "⚠️  Warning: EMAIL_USER or EMAIL_PASS is not set. Email invitations will fail."
  );
}

export default config;
