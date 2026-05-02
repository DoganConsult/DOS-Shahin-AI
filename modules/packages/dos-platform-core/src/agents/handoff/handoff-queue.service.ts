export interface AgentHandoffMessage {
  id: string;
  agentId?: string;
  payload: unknown;
  createdAt: string;
}

const _handoffQueue: AgentHandoffMessage[] = [];

export function enqueueHandoff(handoff: unknown): void {
  const entry: AgentHandoffMessage = {
    id: 'handoff-' + Date.now() + '-' + Math.random().toString(16).slice(2),
    payload: handoff,
    createdAt: new Date().toISOString(),
  };
  _handoffQueue.push(entry);
}

export function getHandoffBatch(agentId: string, limit = 50): unknown[] {
  const out: unknown[] = [];
  const remaining: AgentHandoffMessage[] = [];

  for (const msg of _handoffQueue) {
    if (out.length >= limit) {
      remaining.push(msg);
      continue;
    }
    if (!msg.agentId || msg.agentId === agentId) {
      out.push(msg.payload);
    } else {
      remaining.push(msg);
    }
  }

  _handoffQueue.length = 0;
  _handoffQueue.push(...remaining);
  return out;
}

