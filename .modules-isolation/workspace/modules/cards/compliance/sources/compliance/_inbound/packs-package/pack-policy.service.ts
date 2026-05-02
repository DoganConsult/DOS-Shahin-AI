import { logger } from '@dos/platform-core/observability';

export async function list(...args: any[]): Promise<any[]> { return []; }
export async function getById(...args: any[]): Promise<any> { return null; }
export async function create(...args: any[]): Promise<any> { return {}; }
export async function update(...args: any[]): Promise<any> { return {}; }
export async function remove(...args: any[]): Promise<void> {}

export class PackPolicyService {
  [key: string]: (...args: any[]) => any;
  async list(...args: any[]): Promise<any[]> { return []; }
  async getById(...args: any[]): Promise<any> { return null; }
  async create(...args: any[]): Promise<any> { return {}; }
  async update(...args: any[]): Promise<any> { return {}; }
  async remove(...args: any[]): Promise<void> {}
}
