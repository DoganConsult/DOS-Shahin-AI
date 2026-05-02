#!/usr/bin/env node
/**
 * Restore MessageService / ConfirmationService / MenuItem / TableLazyLoadEvent
 * imports + class fields after the PrimeNG → Carbon codemod stripped them.
 *
 * For every .ts file under modules/compliance/ui that references
 *   this.msg.<method>     (PrimeNG MessageService idiom)
 *   this.messageService.<method>
 *   this.confirmationService.<method>
 *   MenuItem / TableLazyLoadEvent type names
 *
 * we:
 *   1) ensure an `import { MessageService, ConfirmationService, MenuItem, TableLazyLoadEvent } from '@app/services/toast.service';`
 *      is present (only the symbols actually used).
 *   2) inject `private msg = inject(MessageService);` (or analogous) into the
 *      class body when missing.
 *
 * Idempotent.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'ui');

function listTs(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) listTs(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function fix(file) {
  let src = readFileSync(file, 'utf8');
  const before = src;

  const usesMsg = /\bthis\.msg\b/.test(src);
  const usesMessageService = /\bthis\.messageService\b/.test(src) && !usesMsg;
  const usesConfirmation = /\bthis\.confirmationService\b/.test(src);
  const usesMenuItem = /\bMenuItem\b/.test(src);
  const usesLazyLoad = /\bTableLazyLoadEvent\b/.test(src);

  if (!usesMsg && !usesMessageService && !usesConfirmation && !usesMenuItem && !usesLazyLoad) {
    return false;
  }

  // 1. Ensure import exists.
  const symbols = [];
  if (usesMsg || usesMessageService) symbols.push('MessageService');
  if (usesConfirmation) symbols.push('ConfirmationService');
  if (usesMenuItem) symbols.push('MenuItem');
  if (usesLazyLoad) symbols.push('TableLazyLoadEvent');

  if (symbols.length && !/from\s+['"]@app\/services\/toast['"]/.test(src)) {
    const importLine = `import { ${symbols.join(', ')} } from '@app/services/toast.service';\n`;
    // Insert after the last existing import statement.
    const lines = src.split('\n');
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) lastImport = i;
    }
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, importLine.trimEnd());
    } else {
      lines.unshift(importLine.trimEnd());
    }
    src = lines.join('\n');
  } else if (symbols.length && /from\s+['"]@app\/services\/toast['"]/.test(src)) {
    // Merge missing symbols into the existing import.
    src = src.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]@app\/services\/toast['"]\s*;/,
      (_m, body) => {
        const have = new Set(body.split(',').map((s) => s.trim()).filter(Boolean));
        for (const s of symbols) have.add(s);
        return `import { ${[...have].sort().join(', ')} } from '@app/services/toast.service';`;
      },
    );
  }

  // 2. Ensure inject() field exists for each used service.
  // Find the @Component class declaration.
  const classMatch = src.match(/export\s+class\s+(\w+)\s*(?:extends\s+\w+\s*)?(?:implements\s+[^\{]+)?\{/);
  if (classMatch && (usesMsg || usesMessageService || usesConfirmation)) {
    const classBodyStart = classMatch.index + classMatch[0].length;
    const inserts = [];

    if ((usesMsg && !/private\s+msg\s*[:=]/.test(src)) ||
        (usesMessageService && !/private\s+messageService\s*[:=]/.test(src))) {
      const fieldName = usesMsg ? 'msg' : 'messageService';
      inserts.push(`  private ${fieldName} = inject(MessageService);`);
    }
    if (usesConfirmation && !/private\s+confirmationService\s*[:=]/.test(src)) {
      inserts.push('  private confirmationService = inject(ConfirmationService);');
    }

    if (inserts.length) {
      // Need inject from @angular/core
      if (!/import\s*\{[^}]*\binject\b[^}]*\}\s*from\s*['"]@angular\/core['"]/.test(src)) {
        src = src.replace(
          /import\s*\{([^}]*)\}\s*from\s*['"]@angular\/core['"]\s*;/,
          (_m, body) => {
            const have = new Set(body.split(',').map((s) => s.trim()).filter(Boolean));
            have.add('inject');
            return `import { ${[...have].sort().join(', ')} } from '@angular/core';`;
          },
        );
      }
      const insertion = '\n' + inserts.join('\n') + '\n';
      src = src.slice(0, classBodyStart) + insertion + src.slice(classBodyStart);
    }
  }

  if (src !== before) {
    writeFileSync(file, src);
    return true;
  }
  return false;
}

let touched = 0;
for (const f of listTs(ROOT)) {
  if (fix(f)) touched++;
}
console.log(JSON.stringify({ filesChanged: touched }, null, 2));
