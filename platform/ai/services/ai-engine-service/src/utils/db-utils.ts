

export function getFirstRow<T = any>(result: any): T | null {
  return result?.rows?.[0] ?? null;
}

export function getFirstRowOrThrow<T = any>(result: any, message = 'Row not found'): T {
  const row = result?.rows?.[0];
  if (!row) throw new Error(message);
  return row as T;
}
