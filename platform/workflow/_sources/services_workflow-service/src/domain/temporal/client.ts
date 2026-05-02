// ============================================
// Temporal Client Singleton
// Shared connection for starting workflows
// and sending signals from Express API
// ============================================

import { Client, Connection } from '@temporalio/client';

let _connection: Connection | null = null;
let _client: Client | null = null;

/**
 * Returns a shared Temporal client instance.
 * Connection is lazily created on first call.
 * 
 * NATIVE INSTALLATION (No Docker):
 * - Temporal Server runs natively on localhost:7233
 * - See: backend/docs/TEMPORAL-NATIVE-SETUP.md for installation guide
 * - Configuration: TEMPORAL_ADDRESS=127.0.0.1:7233 (or localhost:7233)
 */
export async function getTemporalClient(): Promise<Client> {
  if (_client) return _client;

  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  _connection = await Connection.connect({ address });
  _client = new Client({ connection: _connection, namespace });

  return _client;
}

/**
 * Gracefully close the Temporal connection.
 * Called during process shutdown.
 */
export async function closeTemporalClient(): Promise<void> {
  if (_connection) {
    await _connection.close();
    _connection = null;
    _client = null;
  }
}
