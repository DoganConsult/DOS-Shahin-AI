
export function getOrCreateBreaker(_name: string): any { return { state: 'closed', exec: async (fn: any) => fn() }; }
