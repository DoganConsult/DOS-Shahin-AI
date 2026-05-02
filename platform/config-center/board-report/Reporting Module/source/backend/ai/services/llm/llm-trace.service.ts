export function createTraceId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function recordTrace(_entry: Record<string, unknown>): Promise<void> {
  return;
}
