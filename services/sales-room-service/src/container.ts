import type { AssetsService } from './domain/assets.service';
import type { StorageDriver } from './storage';

interface Container {
  assetsService: AssetsService;
  storage: StorageDriver;
}

let _ctx: Container | null = null;

export function setContainer(c: Container): void {
  _ctx = c;
}

export function container(): Container {
  if (!_ctx) throw new Error('[sales-room-service] container not initialized');
  return _ctx;
}
