// Type shims for packages whose `exports` block lacks a `types` condition,
// which NodeNext module resolution otherwise can't traverse.

declare module 'redlock' {
  import type { Redis as IORedis } from 'ioredis';
  import type Cluster from 'ioredis';

  export interface Lock {
    resource: string[];
    value: string;
    expiration: number;
    attempts: Promise<unknown>[];
    release(): Promise<{ attempts: Promise<unknown>[] }>;
    extend(ttl: number): Promise<Lock>;
  }

  export interface Settings {
    driftFactor?: number;
    retryCount?: number;
    retryDelay?: number;
    retryJitter?: number;
    automaticExtensionThreshold?: number;
  }

  export default class Redlock {
    constructor(clients: Array<IORedis | Cluster>, settings?: Settings);
    acquire(resources: string[], duration: number, settings?: Partial<Settings>): Promise<Lock>;
    release(lock: Lock): Promise<{ attempts: Promise<unknown>[] }>;
    extend(lock: Lock, duration: number): Promise<Lock>;
    using<T>(resources: string[], duration: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T>;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }
}
