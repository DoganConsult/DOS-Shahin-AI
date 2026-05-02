export class CycleContext {
  constructor(public readonly tenantId: string, public readonly correlationId: string = crypto.randomUUID()) {}
}
