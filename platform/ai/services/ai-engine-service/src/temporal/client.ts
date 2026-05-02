// Singleton Temporal client used by REST routes to start workflows from
// inside the ai-engine-service process. Reads connection params from env so
// the same code path works in dev (Docker compose) and prod (managed Cloud).

import { Client, Connection } from '@temporalio/client';

const NAMESPACE = process.env.TEMPORAL_NAMESPACE || 'ai-os';
const ADDRESS = process.env.TEMPORAL_ADDRESS || '127.0.0.1:7233';
const TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || 'ai-os-task-queue';

let _client: Client | null = null;
let _connection: Connection | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (_client) return _client;
  _connection = await Connection.connect({ address: ADDRESS });
  _client = new Client({ connection: _connection, namespace: NAMESPACE });
  return _client;
}

export function getTaskQueue(): string {
  return TASK_QUEUE;
}

export async function closeTemporalClient(): Promise<void> {
  if (_connection) {
    await _connection.close();
    _connection = null;
    _client = null;
  }
}
