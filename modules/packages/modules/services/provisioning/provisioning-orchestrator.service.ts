import { logger } from '@dos/platform-core/observability';

export async function list(...args: any[]): Promise<any[]> { return []; }
export async function getById(...args: any[]): Promise<any> { return null; }
export async function create(...args: any[]): Promise<any> { return {}; }
export async function update(...args: any[]): Promise<any> { return {}; }
export async function remove(...args: any[]): Promise<void> {}

export class ProvisioningOrchestratorService {
  [key: string]: (...args: any[]) => any;
  async list(...args: any[]): Promise<any[]> { return []; }
  async getById(...args: any[]): Promise<any> { return null; }
  async create(...args: any[]): Promise<any> { return {}; }
  async update(...args: any[]): Promise<any> { return {}; }
  async remove(...args: any[]): Promise<void> {}
  async approve(...args: any[]): Promise<any> { return {}; }
  async startProvisioning(...args: any[]): Promise<any> { return {}; }
  async getTemporalStatus(...args: any[]): Promise<any> { return {}; }
  async retryProvisioning(...args: any[]): Promise<any> { return {}; }
  async cancelProvisioning(...args: any[]): Promise<any> { return {}; }
}
