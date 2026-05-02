import { RecordsRepository } from '../repositories/records.repository';
import { safeQuery } from "@dos/db";

export async function list(tenantId: string, limit = 50, offset = 0) {
  const repo = new RecordsRepository(tenantId);
  const page = Math.max(1, Math.floor(offset / limit) + 1);
  return repo.findAll({ page, pageSize: limit });
}

export async function getById(id: string, tenantId: string) {
  const repo = new RecordsRepository(tenantId);
  return repo.findById(id);
}

export async function create(data: Record<string, unknown>, tenantId: string) {
  const repo = new RecordsRepository(tenantId);
  return repo.create(data);
}

export async function update(id: string, data: Record<string, unknown>, tenantId: string) {
  const repo = new RecordsRepository(tenantId);
  return repo.update(id, data);
}

export async function remove(id: string, tenantId: string) {
  const repo = new RecordsRepository(tenantId);
  return repo.softDelete(id);
}
