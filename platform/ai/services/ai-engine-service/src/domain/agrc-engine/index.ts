// AgrcEngine module — barrel export
import './lifecycle-registration';

export * from './events/agrc-engine.events';
export { registerAgrcEngineEventSubscribers } from './events/agrc-engine.subscribers';
export { AGRC_ENGINE_MANIFEST } from './manifest/agrc-engine.manifest';
