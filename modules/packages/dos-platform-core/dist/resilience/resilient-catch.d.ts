export { swallow, swallowNull, swallowEmpty, swallowDefault, swallowSync, catchHandler, EC, ErrorCategory } from './resilience';
export declare function resilientCatch(category: string): (_target: any, _key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
