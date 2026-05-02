import fs from 'node:fs';
import path from 'node:path';

const targetDirArg = process.argv[2];

if (!targetDirArg) {
  console.error('Usage: node ops/scripts/fix-esm-relative-imports.mjs <dist-dir>');
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), targetDirArg);
const JS_FILE_PATTERN = /\.js$/u;
const KNOWN_RUNTIME_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.node']);
const SPECIFIER_PATTERNS = [
  /(from\s+['"])(\.{1,2}\/[^'"]+)(['"])/g,
  /(import\s*\(\s*['"])(\.{1,2}\/[^'"]+)(['"]\s*\))/g,
  /(import\s+['"])(\.{1,2}\/[^'"]+)(['"])/g,
];

function hasRuntimeExtension(specifier) {
  return KNOWN_RUNTIME_EXTENSIONS.has(path.posix.extname(specifier));
}

function resolveRuntimeSpecifier(filePath, specifier) {
  if (hasRuntimeExtension(specifier)) {
    return specifier;
  }

  const resolvedBasePath = path.resolve(path.dirname(filePath), specifier);
  const fileCandidate = `${resolvedBasePath}.js`;
  if (fs.existsSync(fileCandidate)) {
    return `${specifier}.js`;
  }

  const indexCandidate = path.join(resolvedBasePath, 'index.js');
  if (fs.existsSync(indexCandidate)) {
    return `${specifier}/index.js`;
  }

  return specifier;
}

function rewriteFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let updated = original;

  for (const pattern of SPECIFIER_PATTERNS) {
    updated = updated.replace(pattern, (_match, prefix, specifier, suffix) => {
      const rewrittenSpecifier = resolveRuntimeSpecifier(filePath, specifier);
      return `${prefix}${rewrittenSpecifier}${suffix}`;
    });
  }

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
  }
}

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath);
      continue;
    }

    if (JS_FILE_PATTERN.test(entry.name)) {
      rewriteFile(entryPath);
    }
  }
}

walk(targetDir);