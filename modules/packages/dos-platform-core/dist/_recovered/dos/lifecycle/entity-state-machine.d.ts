export declare class EntityStateMachine<_S extends string = string> {
    constructor(_cfg: any);
    canTransition(_from: string, _to: string): boolean;
    transition(_from: string, _to: string): string;
}
export default EntityStateMachine;
