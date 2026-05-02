/**
 * Safely extract a message from an any catch variable.
 */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
