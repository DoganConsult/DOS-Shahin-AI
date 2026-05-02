"use strict";
/**
 * @dos/module-sdk pagination utilities
 * Pagination helpers for list endpoints and database queries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_PAGE_SIZE = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.DEFAULT_PAGE = void 0;
exports.parsePaginationParams = parsePaginationParams;
exports.parsePageNumber = parsePageNumber;
exports.parsePageSize = parsePageSize;
exports.parseSortBy = parseSortBy;
exports.parseSortOrder = parseSortOrder;
exports.calculateOffset = calculateOffset;
exports.calculateTotalPages = calculateTotalPages;
exports.buildPaginatedMeta = buildPaginatedMeta;
exports.buildExtendedPaginatedMeta = buildExtendedPaginatedMeta;
exports.buildPaginatedResult = buildPaginatedResult;
exports.emptyPaginatedResult = emptyPaginatedResult;
exports.paginateArray = paginateArray;
exports.paginateAndSortArray = paginateAndSortArray;
exports.buildSQLPagination = buildSQLPagination;
exports.buildSQLOrderBy = buildSQLOrderBy;
exports.parseCursorParams = parseCursorParams;
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
exports.buildCursorPaginatedResult = buildCursorPaginatedResult;
// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────
exports.DEFAULT_PAGE = 1;
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 200;
exports.MIN_PAGE_SIZE = 1;
// ────────────────────────────────────────────────────────────────────────────
// Pagination Parameter Parsing
// ────────────────────────────────────────────────────────────────────────────
function parsePaginationParams(query) {
    const page = parsePageNumber(query.page);
    const pageSize = parsePageSize(query.pageSize ?? query.limit ?? query.perPage);
    const sortBy = parseSortBy(query.sortBy ?? query.orderBy);
    const sortOrder = parseSortOrder(query.sortOrder ?? query.order);
    return {
        page,
        limit: pageSize,
        pageSize,
        sortBy,
        sortOrder,
    };
}
function parsePageNumber(value) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return exports.DEFAULT_PAGE;
}
function parsePageSize(value) {
    let size;
    if (typeof value === 'number' && Number.isInteger(value)) {
        size = value;
    }
    else if (typeof value === 'string') {
        size = parseInt(value, 10);
        if (Number.isNaN(size)) {
            return exports.DEFAULT_PAGE_SIZE;
        }
    }
    else {
        return exports.DEFAULT_PAGE_SIZE;
    }
    // Clamp to valid range
    return Math.max(exports.MIN_PAGE_SIZE, Math.min(exports.MAX_PAGE_SIZE, size));
}
function parseSortBy(value) {
    if (typeof value === 'string' && value.trim().length > 0) {
        // Sanitize to prevent SQL injection
        const sanitized = value.replace(/[^a-zA-Z0-9_.-]/g, '');
        return sanitized.length > 0 ? sanitized : undefined;
    }
    return undefined;
}
function parseSortOrder(value) {
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'desc' || lower === 'descending' || lower === '-1') {
            return 'desc';
        }
    }
    return 'asc';
}
// ────────────────────────────────────────────────────────────────────────────
// Offset Calculation
// ────────────────────────────────────────────────────────────────────────────
function calculateOffset(page, pageSize) {
    return (Math.max(1, page) - 1) * pageSize;
}
function calculateTotalPages(total, pageSize) {
    if (total <= 0 || pageSize <= 0)
        return 0;
    return Math.ceil(total / pageSize);
}
// ────────────────────────────────────────────────────────────────────────────
// Pagination Metadata
// ────────────────────────────────────────────────────────────────────────────
function buildPaginatedMeta(total, page, pageSize, requestId) {
    return {
        requestId: requestId || '',
        timestamp: new Date().toISOString(),
        page,
        pageSize,
        total,
        totalPages: calculateTotalPages(total, pageSize),
    };
}
function buildExtendedPaginatedMeta(total, page, pageSize, requestId) {
    const base = buildPaginatedMeta(total, page, pageSize, requestId);
    return {
        ...base,
        hasNextPage: page < base.totalPages,
        hasPreviousPage: page > 1,
        firstPage: 1,
        lastPage: Math.max(1, base.totalPages),
    };
}
// ────────────────────────────────────────────────────────────────────────────
// Paginated Result Builders
// ────────────────────────────────────────────────────────────────────────────
function buildPaginatedResult(data, total, page, pageSize) {
    return {
        data,
        total,
        page,
        limit: pageSize,
        pageSize,
        totalPages: calculateTotalPages(total, pageSize),
    };
}
function emptyPaginatedResult(page = exports.DEFAULT_PAGE, pageSize = exports.DEFAULT_PAGE_SIZE) {
    return buildPaginatedResult([], 0, page, pageSize);
}
// ────────────────────────────────────────────────────────────────────────────
// In-Memory Pagination
// ────────────────────────────────────────────────────────────────────────────
/**
 * Paginate an in-memory array
 */
function paginateArray(items, page, pageSize) {
    const total = items.length;
    const offset = calculateOffset(page, pageSize);
    const data = items.slice(offset, offset + pageSize);
    return buildPaginatedResult(data, total, page, pageSize);
}
/**
 * Paginate and sort an in-memory array
 */
function paginateAndSortArray(items, params, sortFn) {
    let sorted = [...items];
    if (sortFn) {
        sorted.sort(sortFn);
    }
    else if (params.sortBy) {
        const key = params.sortBy;
        const multiplier = params.sortOrder === 'desc' ? -1 : 1;
        sorted.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal === bVal)
                return 0;
            if (aVal === null || aVal === undefined)
                return 1;
            if (bVal === null || bVal === undefined)
                return -1;
            return (aVal < bVal ? -1 : 1) * multiplier;
        });
    }
    return paginateArray(sorted, params.page, params.limit ?? params.pageSize ?? exports.DEFAULT_PAGE_SIZE);
}
function buildSQLPagination(params) {
    const limit = params.limit ?? params.pageSize ?? exports.DEFAULT_PAGE_SIZE;
    const offset = calculateOffset(params.page, limit);
    return {
        limitClause: `LIMIT ${limit}`,
        offsetClause: `OFFSET ${offset}`,
        combined: `LIMIT ${limit} OFFSET ${offset}`,
        params: { limit, offset },
    };
}
const ALLOWED_SORT_COLUMNS = new Set([
    'id',
    'created_at',
    'updated_at',
    'name',
    'title',
    'code',
    'status',
    'priority',
    'order',
    'sort_order',
]);
function buildSQLOrderBy(params, allowedColumns, defaultColumn = 'created_at') {
    const allowed = allowedColumns ?? ALLOWED_SORT_COLUMNS;
    const column = params.sortBy && allowed.has(params.sortBy) ? params.sortBy : defaultColumn;
    const direction = params.sortOrder === 'desc' ? 'DESC' : 'ASC';
    return {
        clause: `ORDER BY ${column} ${direction}`,
        column,
        direction,
    };
}
function parseCursorParams(query) {
    return {
        cursor: typeof query.cursor === 'string' ? query.cursor : undefined,
        limit: parsePageSize(query.limit),
        direction: query.direction === 'backward' ? 'backward' : 'forward',
    };
}
function encodeCursor(id, timestamp) {
    const ts = timestamp?.toISOString() || new Date().toISOString();
    return Buffer.from(`${id}:${ts}`).toString('base64');
}
function decodeCursor(cursor) {
    try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        const [id, timestamp] = decoded.split(':');
        if (!id || !timestamp)
            return null;
        return { id, timestamp };
    }
    catch {
        return null;
    }
}
function buildCursorPaginatedResult(data, limit, getTimestamp) {
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    let nextCursor = null;
    let prevCursor = null;
    if (items.length > 0) {
        const last = items[items.length - 1];
        const first = items[0];
        nextCursor = hasMore ? encodeCursor(last.id, getTimestamp?.(last)) : null;
        prevCursor = encodeCursor(first.id, getTimestamp?.(first));
    }
    return {
        data: items,
        nextCursor,
        prevCursor,
        hasMore,
    };
}
//# sourceMappingURL=pagination.js.map