import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

type SpecifierUsage = {
  specifier: string;
  names: Set<string>;
  files: Set<string>;
};

function shouldIgnorePath(p: string): boolean {
  const norm = p.replaceAll('\\', '/');
  return (
    norm.includes('/node_modules/') ||
    norm.includes('/dist/') ||
    norm.includes('/.pnpm/') ||
    norm.includes('/coverage/') ||
    norm.includes('/.git/') ||
    norm.includes('/.angular/') ||
    norm.includes('/.next/') ||
    norm.includes('/.cache/')
  );
}

function walk(dir: string, out: string[]): void {
  if (shouldIgnorePath(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (shouldIgnorePath(full)) continue;
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|mts)$/.test(entry.name)) continue;
    out.push(full);
  }
}

function readTsConfig(tsconfigPath: string): ts.ParsedCommandLine {
  const cfg = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (cfg.error) {
    const msg = ts.formatDiagnosticsWithColorAndContext([cfg.error], {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    });
    throw new Error(msg);
  }
  return ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(tsconfigPath));
}

function getModuleExports(checker: ts.TypeChecker, sf: ts.SourceFile): Set<string> {
  const sym = checker.getSymbolAtLocation(sf);
  if (!sym) return new Set();
  return new Set(checker.getExportsOfModule(sym).map(s => s.name));
}

function resolvePlatformCoreEntry(platformCoreSrcRoot: string, specifier: string): string | null {
  if (specifier === '@dos/platform-core') {
    return path.join(platformCoreSrcRoot, 'index.ts');
  }

  const prefix = '@dos/platform-core/';
  if (!specifier.startsWith(prefix)) return null;

  const subpath = specifier.slice(prefix.length);
  const candidates = [
    path.join(platformCoreSrcRoot, `${subpath}.ts`),
    path.join(platformCoreSrcRoot, subpath, 'index.ts'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function collectPlatformCoreUsages(repoRoot: string): Map<string, SpecifierUsage> {
  const files: string[] = [];
  walk(repoRoot, files);

  const bySpecifier = new Map<string, SpecifierUsage>();

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);

    for (const stmt of sf.statements) {
      if (!ts.isImportDeclaration(stmt) && !ts.isExportDeclaration(stmt)) continue;
      const mod = stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null;
      if (!mod) continue;
      if (mod !== '@dos/platform-core' && !mod.startsWith('@dos/platform-core/')) continue;

      const clause = ts.isImportDeclaration(stmt) ? stmt.importClause : stmt.exportClause;
      if (!clause) continue;

      const elements =
        ts.isImportDeclaration(stmt) && clause.namedBindings && ts.isNamedImports(clause.namedBindings)
          ? clause.namedBindings.elements
          : ts.isExportDeclaration(stmt) && clause && ts.isNamedExports(clause)
            ? clause.elements
            : null;

      if (!elements) continue;

      for (const el of elements) {
        const name = (el.propertyName ?? el.name).text;
        const entry = bySpecifier.get(mod) ?? { specifier: mod, names: new Set(), files: new Set() };
        entry.names.add(name);
        entry.files.add(file);
        bySpecifier.set(mod, entry);
      }
    }
  }

  return bySpecifier;
}

export function findMissingPlatformCoreExports(repoRootInput?: string): Array<{
  specifier: string;
  name: string;
  referencedBy: string[];
  entryFile: string | null;
}> {
  const repoRoot = path.resolve(process.cwd());
  void repoRootInput;
  const platformCorePkgRoot = path.join(repoRoot, 'packages', 'dos-platform-core');
  const platformCoreSrcRoot = path.join(platformCorePkgRoot, 'src');
  const platformCoreTsConfigPath = path.join(platformCorePkgRoot, 'tsconfig.json');

  const usage = collectPlatformCoreUsages(repoRoot);
  const config = readTsConfig(platformCoreTsConfigPath);
  const program = ts.createProgram({ rootNames: config.fileNames, options: config.options });
  const checker = program.getTypeChecker();

  const missing: Array<{ specifier: string; name: string; referencedBy: string[]; entryFile: string | null }> = [];

  for (const [specifier, u] of usage) {
    const entryPath = resolvePlatformCoreEntry(platformCoreSrcRoot, specifier);
    if (!entryPath) {
      for (const name of u.names) {
        missing.push({ specifier, name, referencedBy: [...u.files].sort(), entryFile: null });
      }
      continue;
    }

    const sf = program.getSourceFile(entryPath);
    if (!sf) {
      for (const name of u.names) {
        missing.push({ specifier, name, referencedBy: [...u.files].sort(), entryFile: entryPath });
      }
      continue;
    }

    const exported = getModuleExports(checker, sf);
    for (const name of u.names) {
      if (!exported.has(name)) {
        missing.push({ specifier, name, referencedBy: [...u.files].sort(), entryFile: entryPath });
      }
    }
  }

  missing.sort((a, b) => (a.specifier + a.name).localeCompare(b.specifier + b.name));

  return missing;
}

function main(): void {
  const missing = findMissingPlatformCoreExports();
  if (missing.length === 0) {
    process.stdout.write('OK: no missing @dos/platform-core exports detected.\n');
    process.exit(0);
  }

  process.stdout.write(`Missing exports: ${missing.length}\n`);
  for (const item of missing) {
    process.stdout.write(`- ${item.specifier}: ${item.name}\n`);
  }

  process.exitCode = 2;
}

const invokedAsScript = path.resolve(process.argv[1] ?? '') === path.resolve(fileURLToPath(import.meta.url));
if (invokedAsScript) main();
