import pg from 'pg';
export function createPool(url) {
    return new pg.Pool({ connectionString: url });
}
//# sourceMappingURL=db.js.map