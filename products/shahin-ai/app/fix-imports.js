const fs = require('fs');
const path = require('path');

const replacements = [
  // Storage Service
  { regex: /import\s+\{([^}]*StorageService[^}]*)\}\s+from\s+['"][^'"]*storage\.service['"]/g, replace: "import {$1} from '@app/infrastructure'" },
  { regex: /import\s+.*StorageService.*\s+from\s+['"][^'"]*infrastructure\/storage\/storage\.service['"]/g, replace: "import { StorageService } from '@app/infrastructure'" },

  // GRC Operations
  { regex: /from\s+['"]@app\/core\/services\/grc-operations\.service['"]/g, replace: "from '@app/api'" },

  // GRC Form Field
  { regex: /from\s+['"]@app\/blueprint\/shared\/components\/grc-core\/form\/grc-form-field\.component['"]/g, replace: "from '@app/widgets'" },
  { regex: /from\s+['"]@app\/shared\/components\/grc-core\/form\/grc-form-field\.component['"]/g, replace: "from '@app/widgets'" },

  // Foundation Data
  { regex: /from\s+['"]@app\/core\/services\/platform\/foundation-data\.service['"]/g, replace: "from '@app/grc'" },
  { regex: /from\s+['"][^'"]*foundation-data\.service['"]/g, replace: "from '@app/grc'" },

  // Module Kickstart
  { regex: /from\s+['"]@app\/blueprint\/core\/dos\/shell\/module-kickstart\.service['"]/g, replace: "from '@app/modules'" },

  // page-header.component
  { regex: /from\s+['"](.*)shared\/components\/page-header\.component['"]/g, replace: "from '$1shared/components/page-chrome/page-header.component'" },

  // websocket
  { regex: /from\s+['"]@app\/core\/services\/websocket\/websocket-notification\.service['"]/g, replace: "from '@app/websocket'" },

  // idle-timeout
  { regex: /from\s+['"]@app\/infrastructure\/idle\/idle-timeout\.service['"]/g, replace: "from '@app/infrastructure'" },

  // i18n
  { regex: /from\s+['"]@app\/infrastructure\/i18n\/i18n\.service['"]/g, replace: "from '@app/infrastructure'" },

  // environments
  { regex: /from\s+['"](\.\.\/)+environments\/environment['"]/g, replace: "from '@env/environment'" },

  // design-tokens
  { regex: /from\s+['"]src\/styles\/design-tokens\.css['"]/g, replace: "from '../../../styles/design-tokens.css'" },

  // shared.types
  { regex: /from\s+['"]\.\.\/\.\.\/\.\.\/core\/models\/shared\.types['"]/g, replace: "from '@app/core/models/shared.types'" },
  { regex: /from\s+['"](\.\.\/)+core\/models\/shared\.types['"]/g, replace: "from '@app/core/models/shared.types'" },
  
  // Specific absolute bad imports
  { regex: /from\s+['"]@app\/blueprint\/(.*)['"]/g, replace: "from '@app/$1'" },

  // compliance-api.service relative paths -> let's map it to an alias if possible, but @app/api might be better if it's there. 
  // It's in features/compliance/services/compliance-api.service.ts.
];

function processPath(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processPath(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const r of replacements) {
        if (r.regex.test(content)) {
          content = content.replace(r.regex, r.replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed imports in ${fullPath}`);
      }
    }
  }
}

processPath(path.join(__dirname, 'src'));
