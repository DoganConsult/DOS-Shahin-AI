import fs from 'fs';
import path from 'path';

// Recursively find all TS files in directory
function findFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const targetDir = path.join(process.cwd(), 'src');
const tsFiles = findFiles(targetDir);

let fixed = 0;

for (const file of tsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Cast router
  content = content.replace(/const\s+router\s*=\s*Router\(\);/g, "import type { Router as ExpressRouter } from 'express';\nconst router: ExpressRouter = Router();");
  content = content.replace(/export\s+const\s+router\s*=\s*Router\(\);/g, "import type { Router as ExpressRouter } from 'express';\nexport const router: ExpressRouter = Router();");
  content = content.replace(/export\s+const\s+aiEvaluatorRouter\s*=\s*Router\(\);/g, "import type { Router as ExpressRouter } from 'express';\nexport const aiEvaluatorRouter: ExpressRouter = Router();");

  // Missed `../_shared` imports
  content = content.replace(/from\s+['"](?:\.\.\/)+_shared(.*)['"]/g, "from '@dos/types'");
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixed++;
  }
}

console.log(`Executed TS-CAST on ${fixed} files inside ai-engine-service.`);
