declare module 'json-rules-engine' {
  export class Engine {
    addRule(rule: unknown): void;
    run(facts: unknown): Promise<{ events: Array<{ type: string; params?: Record<string, unknown> }> }>;
  }
}
