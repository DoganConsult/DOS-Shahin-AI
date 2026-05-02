import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const registryPath = path.join(rootDir, 'platform/registries/services.registry.json');
const raw = fs.readFileSync(registryPath, 'utf8');
let registry = JSON.parse(raw);

const servicesDir = path.join(rootDir, 'services');
const services = fs.readdirSync(servicesDir).filter(f => fs.statSync(path.join(servicesDir, f)).isDirectory());

// Only keep registry items where the service directory actually exists
registry = registry.filter(item => typeof item === 'object' && services.includes(item.serviceCode));

for (const svc of services) {
  const existing = registry.find(r => r.serviceCode === svc);
  if (!existing) {
    registry.push({
      serviceCode: svc,
      displayName: svc.replace(/-/g, ' '),
      layer: "domain-service",
      ownerTeam: "product-shahin",
      runtime: "node",
      dependsOn: ["auth-service", "tenant-service"],
      modules: [],
      exposes: {
        apiBase: `/api/${svc.replace('-service', '')}`
      }
    });
  }
}

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
console.log('Cleaned registry natively. Re-running validation...');
