import { logger } from '@dos/module-sdk';
import type { Response } from 'express';
import { safeQuery } from "@dos/db";

const clients = new Map<string, Response>();

export function addSseClient(clientId: string, res: Response): void {
  clients.set(clientId, res);
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.on('close', () => { clients.delete(clientId); });
  logger.debug('[SSE] Client connected', { clientId });
}

export function broadcastSseEvent(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, res] of clients) {
    res.write(payload);
  }
}

export function sendSseToClient(clientId: string, event: string, data: unknown): void {
  const client = clients.get(clientId);
  if (client) {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

export function getSseClientCount(): number {
  return clients.size;
}

export function removeSseClient(clientId: string): void {
  clients.delete(clientId);
}

export const sseService = { addSseClient, broadcastSseEvent, sendSseToClient, getSseClientCount, removeSseClient };
