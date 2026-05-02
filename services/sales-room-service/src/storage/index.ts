import type { StorageDriver } from './driver';
import { FsDriver } from './fs.driver';

let driver: StorageDriver | null = null;

export interface InitStorageOpts {
  driver: string;          // 'fs' | 's3' | 'r2'
  fsRoot?: string;
}

export function initStorage(opts: InitStorageOpts): StorageDriver {
  switch (opts.driver) {
    case 'fs':
      driver = new FsDriver(opts.fsRoot || '/data/sales-room/objects');
      return driver;
    case 's3':
    case 'r2':
      throw new Error(`storage driver '${opts.driver}' arrives in Wave 2+. Set SALES_ROOM_STORAGE_DRIVER=fs.`);
    default:
      throw new Error(`unknown storage driver '${opts.driver}'`);
  }
}

export function getStorage(): StorageDriver {
  if (!driver) throw new Error('storage not initialized — call initStorage() first');
  return driver;
}

export type { StorageDriver, PutObjectInput, PutObjectResult } from './driver';
