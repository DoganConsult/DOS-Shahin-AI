import { safeQuery } from "@dos/db";

// ============================================
// AGRC-OS — Agent Health Monitor Service
// Tracks health and performance of all AI agents
// (A01-A12). Provides real-time health status
// and historical metrics for the operating cockpit.
// Requirements: ai-os-8.2
// ============================================

/** Health status for a single AI agent. */
export interface AgentHealthStatus {
  agentId: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastRunAt: string | null;
  successRate: number;
  avgLatencyMs: number;
  errorCount: number;
  lastError: string | null;
}

/** Sliding-window size for computing rolling metrics. */
const WINDOW_SIZE = 50;

/** Thresholds for status classification. */
const DEGRADED_ERROR_RATE = 0.2;
const UNHEALTHY_ERROR_RATE = 0.5;
const OFFLINE_SILENCE_MS = 2 * 60 * 60 * 1000; // 2 hours without a run

interface ExecutionRecord {
  success: boolean;
  durationMs: number;
  error?: string;
  timestamp: number;
}

export class AgentHealthMonitor {
  private healthMap = new Map<string, AgentHealthStatus>();
  private windowMap = new Map<string, ExecutionRecord[]>();

  /** Record the result of an agent execution. */
  recordExecution(agentId: string, success: boolean, durationMs: number, error?: string): void {
    const now = Date.now();
    const record: ExecutionRecord = { success, durationMs, error, timestamp: now };

    // Maintain sliding window
    const window = this.windowMap.get(agentId) || [];
    window.push(record);
    if (window.length > WINDOW_SIZE) window.shift();
    this.windowMap.set(agentId, window);

    // Recompute health from window
    const successes = window.filter((r) => r.success).length;
    const successRate = window.length > 0 ? successes / window.length : 1;
    const avgLatency = window.length > 0
      ? Math.round(window.reduce((s, r) => s + r.durationMs, 0) / window.length)
      : 0;
    const errorCount = window.filter((r) => !r.success).length;
    const lastError = error || this.healthMap.get(agentId)?.lastError || null;

    const status = this.classifyStatus(successRate, now, window);

    this.healthMap.set(agentId, {
      agentId,
      name: agentId, // caller can override via setAgentName
      status,
      lastRunAt: new Date(now).toISOString(),
      successRate: Math.round(successRate * 1000) / 1000,
      avgLatencyMs: avgLatency,
      errorCount,
      lastError,
    });
  }

  /** Get health for a single agent, or null if never recorded. */
  getHealth(agentId: string): AgentHealthStatus | null {
    return this.healthMap.get(agentId) || null;
  }

  /** Get health for all known agents. */
  getAllHealth(): AgentHealthStatus[] {
    return Array.from(this.healthMap.values());
  }

  /** Return agents whose status is degraded, unhealthy, or offline. */
  getUnhealthyAgents(): AgentHealthStatus[] {
    return this.getAllHealth().filter((h) => h.status !== 'healthy');
  }

  /** Classify agent status based on error rate and recency. */
  private classifyStatus(
    successRate: number,
    now: number,
    window: ExecutionRecord[],
  ): AgentHealthStatus['status'] {
    if (window.length === 0) return 'offline';
    const lastTs = window[window.length - 1].timestamp;
    if (now - lastTs > OFFLINE_SILENCE_MS) return 'offline';

    const errorRate = 1 - successRate;
    if (errorRate >= UNHEALTHY_ERROR_RATE) return 'unhealthy';
    if (errorRate >= DEGRADED_ERROR_RATE) return 'degraded';
    return 'healthy';
  }
}

/** Singleton instance shared across the application. */
export const agentHealthMonitor = new AgentHealthMonitor();
