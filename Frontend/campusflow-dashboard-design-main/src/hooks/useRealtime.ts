import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeProps {
    table: string;
    event?: RealtimeEvent;
    filter?: string;
    schema?: string;
    callback: (payload: RealtimePostgresChangesPayload<any>) => void;
    enabled?: boolean;
}

/**
 * Custom hook to subscribe to Supabase Realtime changes
 */
export function useRealtime({
    table,
    event = '*',
    filter,
    schema = 'public',
    callback,
    enabled = true,
}: UseRealtimeProps) {
    // Use a ref for the callback to prevent unnecessary re-subscriptions
    // if the callback function identity changes
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) return;

        const channelName = `public:${table}:${event}${filter ? `:${filter}` : ''}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event,
                    schema,
                    table,
                    filter,
                },
                (payload) => {
                    callbackRef.current(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`📡 Realtime connected to ${table} (${event})`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
            console.log(`🔌 Realtime disconnected from ${table}`);
        };
    }, [table, event, filter, schema, enabled]);
}
