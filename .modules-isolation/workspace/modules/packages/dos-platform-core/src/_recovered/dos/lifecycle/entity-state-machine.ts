export class EntityStateMachine<_S extends string = string> {
  constructor(_cfg: any) {}
  canTransition(_from: string, _to: string): boolean { return true; }
  transition(_from: string, _to: string): string { return _to; }
}
export default EntityStateMachine;
