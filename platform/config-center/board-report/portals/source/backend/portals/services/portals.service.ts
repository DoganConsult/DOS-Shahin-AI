import { PortalsRepository } from '../repositories/portals.repository';
import { safeQuery } from "@dos/db";

export async function list(tenantId: string, limit = 50, offset = 0) {
  const repo = new PortalsRepository(tenantId);
  const page = Math.max(1, Math.floor(offset / limit) + 1);
  return repo.findAll({ page, pageSize: limit });
}

export async function getById(id: string, tenantId: string) {
  const repo = new PortalsRepository(tenantId);
  return repo.findById(id);
}

export async function create(data: Record<string, unknown>, tenantId: string) {
  const repo = new PortalsRepository(tenantId);
  return repo.create(data);
}

export async function update(id: string, data: Record<string, unknown>, tenantId: string) {
  const repo = new PortalsRepository(tenantId);
  return repo.update(id, data);
}

export async function remove(id: string, tenantId: string) {
  const repo = new PortalsRepository(tenantId);
  return repo.softDelete(id);
}
