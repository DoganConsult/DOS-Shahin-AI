import { setModuleRegistry } from '@dos/module-sdk';
class MockRegistry {
    register(manifest) {
        // console.log(`Registered module ${manifest.code || manifest.id}`);
    }
    get(code) {
        return { code };
    }
    getAll() {
        return [];
    }
}
setModuleRegistry(new MockRegistry());
//# sourceMappingURL=test-setup.js.map