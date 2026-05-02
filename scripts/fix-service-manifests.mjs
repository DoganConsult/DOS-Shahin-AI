import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const modulesDir = path.join(rootDir, 'modules');
const servicesDir = path.join(rootDir, 'services');

const modules = fs.readdirSync(modulesDir).filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory());
let seededCount = 0;

for (const mod of modules) {
  const manifestPath = path.join(modulesDir, mod, 'module.manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifestStr = fs.readFileSync(manifestPath, 'utf8');
    let manifest;
    try {
      manifest = JSON.parse(manifestStr);
    } catch { continue; }
    
    if (manifest.futureService) {
      const targetSvcDir = path.join(servicesDir, manifest.futureService);
      if (!fs.existsSync(targetSvcDir)) {
        fs.mkdirSync(targetSvcDir, { recursive: true });
      }
      
      const svcManifestPath = path.join(targetSvcDir, 'service.manifest.json');
      if (!fs.existsSync(svcManifestPath)) {
        const svcManifest = {
          serviceId: manifest.futureService,
          version: "1.0.0",
          domains: [manifest.domain || "governance"],
          dependencies: [],
          apiPrefix: `/api/${manifest.domain || 'core'}/${mod}`
        };
        fs.writeFileSync(svcManifestPath, JSON.stringify(svcManifest, null, 2), 'utf8');
        console.log(`Seeded ${manifest.futureService} for module ${mod}`);
        seededCount++;
      }
    }
  }
}

console.log(`Success: Seeded ${seededCount} missing service manifests.`);
