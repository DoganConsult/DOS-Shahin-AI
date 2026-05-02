import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

// ── Types ────────────────────────────────────────────────────────────────

export type PlatformMode = 'human' | 'hybrid' | 'shadow_agent' | 'full_autonomous';
export type AutonomyLevel = 'none' | 'suggest' | 'co-pilot' | 'autonomous';

export interface PlatformModeConfig {
  mode: PlatformMode;
  autonomyLevel: AutonomyLevel;
  agentEnabled: boolean;
  humanApprovalRequired: boolean;
}

export interface AgentRbacEntry {
  agentId: string;
  allowedActions: string[];
  deniedActions: string[];
  maxAutonomy: AutonomyLevel;
}

export interface AgentRunBreakdown {
  agentId: string;
  runs: number;
  successRate?: number;
  [key: string]: unknown;
}

export interface AgentRunStats {
  totalRuns: number;
  successRate: number;
  avgDurationMs: number;
  agentBreakdown: AgentRunBreakdown[];
  cyclesLast24h?: number;
  [key: string]: unknown;
}

export interface AgentProposal {
  proposalId: string;
  proposal_id?: string;
  agentId: string;
  action: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface MemoryStats {
  totalEntries: number;
  activeEntries: number;
  lastPruned?: string;
}

export interface ShadowAgentConfig {
  enabled: boolean;
  modules: string[];
  maxProposalsPerHour: number;
  requireHumanApproval: boolean;
  user_id?: string;
  agent_id?: string;
  workspace_id?: string;
}

export interface PlatformModeDisplay {
  key: PlatformMode;
  label: string;
  labelAr: string;
  icon: string;
  color: string;
  description?: string;
}

export const PLATFORM_MODES: readonly PlatformModeDisplay[] = [
  { key: 'human', label: 'Human', labelAr: 'يدوي', icon: 'pi-user', color: 'var(--text-body)' },
  { key: 'hybrid', label: 'Hybrid', labelAr: 'هجين', icon: 'pi-users', color: 'var(--primary)' },
  { key: 'shadow_agent', label: 'Shadow Agent', labelAr: 'وكيل ظل', icon: 'pi-eye', color: 'var(--warning)' },
  { key: 'full_autonomous', label: 'Autonomous', labelAr: 'مستقل', icon: 'pi-bolt', color: 'var(--danger)' },
] as const;

// ── Service ──────────────────────────────────────────────────────────────

/**
 * PlatformModeService — Manages the current platform operation mode.
 *
 * Determines whether the platform runs in human-only, hybrid (AI-assisted),
 * shadow agent (AI proposes, human approves), or fully autonomous mode.
 *
 * @owner AI/Agent layer
 */
@Injectable({ providedIn: 'root' })
export class PlatformModeService {
  private readonly _config = signal<PlatformModeConfig>({
    mode: 'human',
    autonomyLevel: 'none',
    agentEnabled: false,
    humanApprovalRequired: true,
  });

  readonly config = this._config.asReadonly();
  readonly currentMode = computed(() => this._config().mode);
  readonly autonomyLevel = computed(() => this._config().autonomyLevel);
  readonly agentEnabled = computed(() => this._config().agentEnabled);
  readonly humanApprovalRequired = computed(() => this._config().humanApprovalRequired);

  readonly currentConfig = computed(() => {
    const cfg = this._config();
    const match = PLATFORM_MODES.find(m => m.key === cfg.mode);
    return match ?? PLATFORM_MODES[0];
  });

  readonly agentRoles = signal<AgentRbacEntry[]>([]);
  readonly runStats = signal<AgentRunStats | null>(null);
  readonly pendingActionsCount = signal(0);
  readonly memoryStats = signal<MemoryStats | null>(null);

  setConfig(config: PlatformModeConfig): void {
    this._config.set(config);
  }

  setMode(mode: PlatformMode): void {
    this._config.update(c => ({
      ...c,
      mode,
      agentEnabled: mode !== 'human',
      humanApprovalRequired: mode !== 'full_autonomous',
      autonomyLevel: mode === 'human' ? 'none'
        : mode === 'hybrid' ? 'suggest'
        : mode === 'shadow_agent' ? 'co-pilot'
        : 'autonomous',
    }));
  }

  setModeQuietly(mode: PlatformMode): void {
    this._config.update(c => ({ ...c, mode }));
  }

  syncFromBackend(): void {
    // Placeholder — sync mode from backend on bootstrap
  }

  loadRunStats(): void {
    // Placeholder — loads agent run stats from backend
  }

  loadMemoryStats(): void {
    // Placeholder — loads memory stats from backend
  }

  isAgentMode(): boolean {
    return this._config().mode !== 'human';
  }

  approveProposal(proposalId: string, comment?: string): Observable<any> {
    return of({ proposalId, status: 'approved', comment });
  }

  rejectProposal(proposalId: string, reason?: string): Observable<any> {
    return of({ proposalId, status: 'rejected', reason });
  }

  updateShadowAgent(userId: string | undefined, config: Partial<ShadowAgentConfig>): Observable<any> {
    return of({ userId, ...config });
  }
}
