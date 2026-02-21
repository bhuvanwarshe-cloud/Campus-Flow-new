import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";

/**
 * Creates a Supabase client instance with the user's JWT token.
 * This client respects Row Level Security (RLS) policies.
 * 
 * @param {string} token - The user's JWT access token
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export const getSupabaseClient = (token) => {
    if (!token) {
        throw new Error("Token is required to create a Supabase client for RLS");
    }

    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
};

export default getSupabaseClient;
