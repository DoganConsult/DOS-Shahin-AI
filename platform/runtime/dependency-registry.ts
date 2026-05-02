import { EMPTY } from 'rxjs';

export class FeatureDependencyRegistry {
  private services = new Map<string, any>();

  register(key: string, instance: any): void {
    this.services.set(key, instance);
  }

  get<T = any>(key: string): T {
    const existing = this.services.get(key);
    if (existing) return existing;

    console.warn(`[FeatureDependencyRegistry] Service ${key} requested but not yet registered. Returning dynamic proxy.`);
    return new Proxy({}, {
       get: (_, prop) => {
         const instance = this.services.get(key);
         if (instance) {
           const val = instance[prop];
           return typeof val === 'function' ? val.bind(instance) : val;
         }
         return () => EMPTY;
       }
    }) as unknown as T;
  }
}

export const featureRegistry = new FeatureDependencyRegistry();
