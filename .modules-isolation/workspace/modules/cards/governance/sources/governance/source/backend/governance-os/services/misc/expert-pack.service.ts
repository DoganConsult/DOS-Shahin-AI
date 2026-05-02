import { safeQuery } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';

export interface ExpertPack {
  id: string;
  code: string;
  name: string;
  description?: string;
  modules: string[];
}

export async function getExpertPack(code: string): Promise<ExpertPack | null> {
  const { rows } = await safeQuery(
    `SELECT id, code, name, description, modules FROM public.governance_os_expert_packs WHERE code = $1 LIMIT 1`,
    [code],
  );
  if (rows.length === 0) return null;
  const r = rows[0] as GenericRow;
  return { id: r.id, code: r.code, name: r.name, description: r.description, modules: r.modules ?? [] };
}

export async function getAllExpertPacks(): Promise<ExpertPack[]> {
  const { rows } = await safeQuery(
    `SELECT id, code, name, description, modules FROM public.governance_os_expert_packs ORDER BY code`,
  );
  return rows.map((r: GenericRow) => ({
    id: r.id, code: r.code, name: r.name, description: r.description, modules: r.modules ?? [],
  }));
}

export async function seedExpertPacks(): Promise<number> {
  return 0;
}
