import api from './api';

export interface AnalyticsMetrics {
    totalStudents: number;
    attendanceRate: number;
    classAverage: number;
}

export interface AnalyticsDistribution {
    '0_40': number;
    '41_60': number;
    '61_80': number;
    '81_100': number;
}

export interface StudentPerformance {
    full_name: string;
    avg_percent: number;
}

export interface ClassAnalyticsResponse {
    metrics: AnalyticsMetrics;
    distribution: AnalyticsDistribution;
    performance: {
        topStudents: StudentPerformance[];
        bottomStudents: StudentPerformance[];
    };
}

export const analyticsService = {
    getTeacherClassAnalytics: async (classId: string): Promise<ClassAnalyticsResponse> => {
        try {
            const response = await api.get(`/analytics/teacher/${classId}`);
            if (response.data?.success) {
                return response.data.data;
            }
            throw new Error(response.data?.error?.message || 'Failed to fetch analytics');
        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw error;
        }
    },
};
