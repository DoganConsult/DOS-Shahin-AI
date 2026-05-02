export { swallow, swallowNull, swallowEmpty, swallowDefault, swallowSync, catchHandler, EC, ErrorCategory } from './resilience';

export function resilientCatch(category: string) {
  return function (_target: any, _key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      try {
        return await original.apply(this, args);
      } catch {
        return null;
      }
    };
    return descriptor;
  };
}
