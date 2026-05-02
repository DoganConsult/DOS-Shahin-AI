export class PostgresCheckpointSaver {
  constructor(_pool?: any) {}
  async get(threadId: string): Promise<any> { return null; }
  async put(threadId: string, checkpoint: any): Promise<void> {}
}
