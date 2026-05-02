import { safeQuery } from "@dos/db";

// @death-date Phase 9 | owner: DOS | replacement: platform/dos/ai-os/ai-os-kernel.types.ts
// Backward-compatibility re-export shim. Canonical source is now platform/dos/ai-os/.
export type {
  ProcessRow,
  SchedulerRow,
  IpcRow,
  MemoryRow,
  LogRow,
  KernelLogEvent,
  KernelProcessView,
  KernelSchedulerView,
  KernelIpcView,
  KernelMemoryView,
  KernelLogView,
  AgentStep,
  KernelProcessDetailView,
  KernelAgentDetailView,
  KernelHealthStatus,
  KernelHealthView,
  KernelSnapshotView,
  KernelOverviewView,
} from '../../ports/platform.port';
