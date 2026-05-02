export function asArray<T = unknown>(data: Record<string, unknown>, key?: string): T[] {
  if (key) {
    const nested = (data as Record<string, unknown>)?.[key];
    if (Array.isArray(nested)) return nested;
  }
  if (Array.isArray(data)) return data;
  return [];
}
