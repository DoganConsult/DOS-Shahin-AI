import { setModuleRegistry } from '@dos/module-sdk';

class MockRegistry {
  register(manifest: any) {
    // console.log(`Registered module ${manifest.code || manifest.id}`);
  }
  get(code: string) {
    return { code };
  }
  getAll() {
    return [];
  }
}

setModuleRegistry(new MockRegistry() as any);
