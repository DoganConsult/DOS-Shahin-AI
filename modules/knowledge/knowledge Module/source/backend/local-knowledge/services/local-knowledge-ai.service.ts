import { logger } from '../ports/logger.port';
import { safeQuery } from "@dos/db";

export async function getAiRecommendations(tenantId: string, _context: Record<string, unknown>): Promise<string[]> {
  logger.debug(`[${tenantId}] local-knowledge AI recommendations requested`);
  return [];
}
