import { randomUUID } from 'node:crypto';

export async function createBoardPack(_tenantId: string, _input: Record<string, unknown>): Promise<{ boardPackId: string }> {
  return { boardPackId: randomUUID() };
}

export async function addBoardPackItem(
  _tenantId: string,
  _boardPackId: string,
  _item: Record<string, unknown>,
): Promise<{ itemId: string }> {
  return { itemId: randomUUID() };
}
