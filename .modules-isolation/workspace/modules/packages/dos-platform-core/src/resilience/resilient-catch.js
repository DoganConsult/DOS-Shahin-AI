export { swallow, swallowNull, swallowEmpty, swallowDefault, swallowSync, catchHandler, EC, ErrorCategory } from './resilience';
export function resilientCatch(category) {
    return function (_target, _key, descriptor) {
        const original = descriptor.value;
        descriptor.value = async function (...args) {
            try {
                return await original.apply(this, args);
            }
            catch {
                return null;
            }
        };
        return descriptor;
    };
}
//# sourceMappingURL=resilient-catch.js.map