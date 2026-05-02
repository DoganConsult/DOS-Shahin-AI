import { getEventBus, publishEvent } from '@dos/module-sdk';
export const eventBus = {
    publish: (...args) => getEventBus().publish(...args),
    subscribe: (...args) => getEventBus().subscribe(...args),
    onAfterPublish: (...args) => {
        const bus = getEventBus();
        if (typeof bus.onAfterPublish === 'function')
            return bus.onAfterPublish(...args);
    },
};
export const emitEvent = publishEvent;
//# sourceMappingURL=events.port.js.map