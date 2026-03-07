import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5100';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to every request
api.interceptors.request.use(async (config) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        }
    } catch (error: any) {
        if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
            console.error('Session retrieval error:', error);
        }
    }

    // For FormData (file uploads), ALWAYS remove Content-Type header — even if explicitly set.
    // The browser will auto-set `multipart/form-data; boundary=...` with the correct boundary token.
    // A manually-set Content-Type WITHOUT the boundary will cause the server to fail parsing.
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
        // Also remove from common headers to be safe
        if (config.headers.common) {
            delete (config.headers.common as Record<string, unknown>)['Content-Type'];
        }
    }

    return config;
});

export default api;
