export async function getModuleOperatingState(..._args) { return { mode: 'active' }; }
export async function setModuleOperatingState(..._args) { }
// Aliases + additional helpers for consumer expectations.
export async function getModuleState(..._args) { return { mode: 'active', state: 'active' }; }
export async function updateModuleState(..._args) { }
export async function getAllModuleStates(..._args) { return []; }
export async function isModuleActive(..._args) { return true; }
//# sourceMappingURL=module-operating-state.service.js.map