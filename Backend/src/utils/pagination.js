/**
 * Pagination helper
 * Calculates range for Supabase queries
 * @param {number} page - Current page (1-based)
 * @param {number} limit - Items per page
 * @returns {Object} { from, to, limit, page }
 */
export const getPagination = (page, limit) => {
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 10;

    const from = (p - 1) * l;
    const to = from + l - 1;

    return { from, to, limit: l, page: p };
};

/**
 * Format paginated response
 * @param {Array} data - Data array
 * @param {number} count - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
export const formatPaginatedResponse = (data, count, page, limit) => {
    return {
        data,
        meta: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
        }
    };
};
