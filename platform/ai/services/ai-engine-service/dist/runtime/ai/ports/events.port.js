import { getEventBus, publishEvent } from '@dos/module-sdk';
export const eventBus = {
    publish: (...args) => getEventBus().publish(...args),
    subscribe: (...args) => getEventBus().subscribe(...args),
    onAfterPublish: (...args) => {
        const bus = getEventBus();
        if (typeof bus.onAfterPublish === 'function')
            return bus.onAfterPublish(...args);
    },
    getBackpressureStats: () => {
        const bus = getEventBus();
        const fn = bus.getBackpressureStats;
        if (typeof fn === 'function')
            return fn.call(bus);
        return { inFlight: 0, maxInFlight: 0, dropped: 0, tenantsActive: 0 };
    },
};
export const emitEvent = publishEvent;
//# sourceMappingURL=events.port.js.map