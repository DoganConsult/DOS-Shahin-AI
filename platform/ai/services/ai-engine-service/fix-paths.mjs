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

  // 1. Fix types imports
  content = content.replace(/from\s+['"](?:\.\.\/)+_shared\/(.*?)['"]/g, "from '@dos/types'");
  content = content.replace(/from\s+['"](?:\.\.\/)+types\/?(.*?)['"]/g, "from '@dos/types'");
  
  // 2. Fix utils/module-sdk
  content = content.replace(/from\s+['"](?:\.\.\/)+utils\/(.*?)['"]/g, "from '@dos/module-sdk'");
  
  // 3. Fix config/database
  content = content.replace(/from\s+['"](?:\.\.\/)+config\/database\.?j?s?['"]/g, "from '@dos/db'");
  content = content.replace(/import\s*\{\s*tenantSchema,\s*safeQuery\s*\}\s*from\s*['"](?:\.\.\/)+config\/database\.j?s?['"];/g, "import { tenantSchema, safeQuery } from '@dos/db';");
  content = content.replace(/import\s*\(\s*['"](?:\.\.\/)+config\/database\.?j?s?['"]\s*\)/g, "import('@dos/db')");

  // 4. Fix platform dos (resilient catch, gate)
  content = content.replace(/from\s+['"](?:\.\.\/)+platform\/dos\/resilience\/(.*?)['"]/g, "from '@dos/platform-core/resilience/$1'");
  content = content.replace(/import\s*\(\s*['"](?:\.\.\/)+platform\/dos\/settings\/platform-mode-gate\.service\.?j?s?['"]\s*\)/g, "import('@dos/platform-core/settings/platform-mode-gate')");
  
  // 5. Fix cross module imports!
  content = content.replace(/from\s+['"](?:\.\.\/)+ai\/(.*?)['"]/g, "from '../../runtime/ai/$1'");
  content = content.replace(/import\s*\(\s*['"](?:\.\.\/)+ai\/(.*?)['"]\s*\)/g, "import('../../runtime/ai/$1')");

  // Type definition error fix for router (adding types explicitly if needed)
  if (content.includes('const router = Router();') && !content.includes('import { Router')) {
    content = content.replace("const router = Router();", "import { Router } from 'express';\nconst router = Router();");
  }

  // Rewrite
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixed++;
  }
}

console.log(`Executed codemods on ${fixed} files inside ai-engine-service.`);
