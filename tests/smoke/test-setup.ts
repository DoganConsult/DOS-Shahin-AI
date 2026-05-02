import { vi } from 'vitest';
import { setModuleRegistry } from './packages/dos-module-sdk/dist/index.js';

class MockRegistry {
  register(manifest: any) {}
  get(code: string) { return { code }; }
  getAll() { return []; }
}
setModuleRegistry(new MockRegistry() as any);

const globalMockDb = {
  rows: [],
  rowCount: 0
};

(globalThis as any).__globalMockQuery = vi.fn().mockResolvedValue(globalMockDb);
(globalThis as any).__globalMockSafeQuery = vi.fn().mockResolvedValue(globalMockDb);



(globalThis as any).__globalPlatformEvents = {
  publish: vi.fn(),
  subscribe: vi.fn(),
  buildEvent: vi.fn((a, b, c) => ({ domain: a, type: b, payload: c })),
};
