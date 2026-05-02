export interface CanaryRecord {
  tenantId: string;
  key: string;
  value: string;
  seededAt: Date;
}

export interface CanaryManagerOptions {
  tenantIds: string[];
  keysPerTenant?: number;
}

export interface CanaryManager {
  seed(): Promise<void>;
  getCanaries(): CanaryRecord[];
  cleanup(): Promise<void>;
}

function generateCanaryValue(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'CANARY_';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createCanaryManager(opts: CanaryManagerOptions): CanaryManager {
  const { tenantIds, keysPerTenant = 3 } = opts;
  const canaries: CanaryRecord[] = [];

  return {
    async seed(): Promise<void> {
      canaries.length = 0;
      for (const tenantId of tenantIds) {
        for (let i = 0; i < keysPerTenant; i++) {
          canaries.push({
            tenantId,
            key: `canary-data-${i + 1}`,
            value: generateCanaryValue(),
            seededAt: new Date(),
          });
        }
      }
    },

    getCanaries(): CanaryRecord[] {
      return [...canaries];
    },

    async cleanup(): Promise<void> {
      canaries.length = 0;
    },
  };
}
