import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const servicesDir = path.join(rootDir, 'services');
const services = fs.readdirSync(servicesDir).filter(f => fs.statSync(path.join(servicesDir, f)).isDirectory());

for (const svc of services) {
  const manifestPath = path.join(servicesDir, svc, 'service.manifest.json');
  if (!fs.existsSync(manifestPath)) {
    const svcManifest = {
      serviceCode: svc,
      version: "1.0.0",
      domains: ["governance"],
      dependencies: [],
      apiPrefix: `/api/core/${svc}`
    };
    fs.writeFileSync(manifestPath, JSON.stringify(svcManifest, null, 2), 'utf8');
    console.log(`Seeded missing root manifest for ${svc}`);
  }
}
