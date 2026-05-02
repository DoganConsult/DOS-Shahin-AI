import pg from 'pg';

export type DbPool = pg.Pool;

export function createPool(url: string): DbPool {
  return new pg.Pool({ connectionString: url });
}
