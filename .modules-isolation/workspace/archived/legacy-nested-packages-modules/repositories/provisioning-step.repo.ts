export async function findById(...args: any[]): Promise<any> { return null; }
export async function findAll(...args: any[]): Promise<any[]> { return []; }
export async function insert(...args: any[]): Promise<any> { return {}; }

export class ProvisioningStepRepo {
  [key: string]: (...args: any[]) => any;
  async findById(...args: any[]): Promise<any> { return null; }
  async findAll(...args: any[]): Promise<any[]> { return []; }
  async insert(...args: any[]): Promise<any> { return {}; }
  async update(...args: any[]): Promise<any> { return {}; }
  async remove(...args: any[]): Promise<void> {}
  async listByJob(...args: any[]): Promise<any[]> { return []; }
}
