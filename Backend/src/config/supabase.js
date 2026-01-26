/**
 * Supabase Configuration & Client Initialization
 * 
 * This file creates two separate Supabase clients:
 * 1. supabaseAdmin - Uses SERVICE_ROLE_KEY for database operations (bypasses RLS)
 * 2. supabaseAuth - Uses ANON_KEY for JWT token verification (respects RLS)
 * 
 * ⚠️  IMPORTANT: NEVER expose supabaseAdmin to the frontend!
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "./env.js";

// ============================================================================
// ADMIN CLIENT - For database operations (bypasses RLS)
// ============================================================================
// Used for: INSERT, UPDATE, DELETE operations that need to bypass Row Level Security
// NEVER expose this key to the frontend
// ⚠️  Keep SERVICE_ROLE_KEY confidential!

export const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================================
// AUTH CLIENT - For JWT token verification (respects RLS)
// ============================================================================
// Used for: Verifying JWT tokens from the frontend using auth.getUser(token)
// Uses ANON_KEY which is safe to expose (frontend uses it too)
// This client properly validates JWT tokens and respects Row Level Security policies

export const supabaseAuth = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================================
// DEFAULT EXPORT - Admin client for backwards compatibility
// ============================================================================
// For new code, prefer importing specific clients (supabaseAdmin, supabaseAuth)

export const supabase = supabaseAdmin;
export default supabase;
