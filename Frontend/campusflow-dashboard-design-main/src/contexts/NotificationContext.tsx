import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type CampusNotification = {
    id: string;
    user_id: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
    type?: "assignment" | "test" | "announcement" | "info" | "warning" | "success" | "error";
    link?: string;
};

interface NotificationContextType {
    notifications: CampusNotification[];
    unreadCount: number;
    loading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { profile, user } = useAuth();
    const [notifications, setNotifications] = useState<CampusNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await api.get("/api/notifications");
            if (data.success) {
                setNotifications(data.data);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchNotifications();
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user, fetchNotifications]);

    // Real-time listener for new notifications
    useRealtime({
        table: "notifications",
        event: "*",
        callback: (payload: any) => {
            const eventType = payload.eventType; // RealtimePostgresChangesPayload uses eventType
            if (eventType === "INSERT") {
                const newNotif = payload.new as CampusNotification;
                // Only act if notification belongs to this user
                if (newNotif.user_id === user?.id) {
                    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
                    setUnreadCount(prev => prev + 1);

                    // Show a toast for the new notification
                    toast(newNotif.title, {
                        description: newNotif.message,
                        action: newNotif.link ? {
                            label: "View",
                            onClick: () => window.location.href = newNotif.link!
                        } : undefined
                    });
                }
            } else if (eventType === "UPDATE" || eventType === "DELETE") {
                fetchNotifications();
            }
        },
        enabled: !!user
    });

    const markAsRead = async (id: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            await api.patch(`/api/notifications/${id}/read`);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
            fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);

            await api.patch("/api/notifications/read-all");
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
            fetchNotifications();
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            fetchNotifications,
            markAsRead,
            markAllAsRead
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
