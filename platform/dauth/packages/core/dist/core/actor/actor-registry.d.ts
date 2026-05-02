export type ActorType = 'human' | 'agent' | 'service_account' | 'external';
export interface Actor {
    actorId: string;
    type: ActorType;
    userId?: string;
    displayName: string;
    tenantId: string;
    isActive: boolean;
}
export declare function getActor(tenantId: string, actorId: string): Promise<Actor | null>;
export declare function registerActor(tenantId: string, actor: Omit<Actor, 'isActive'>): Promise<Actor>;
