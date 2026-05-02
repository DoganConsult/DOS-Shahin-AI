import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function readTsConfig(tsconfigPath: string): ts.ParsedCommandLine {
  const cfg = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (cfg.error) throw new Error(ts.formatDiagnosticsWithColorAndContext([cfg.error], {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  }));
  return ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(tsconfigPath));
}

describe('@dos/platform-core runtime exports', () => {
  it('provides a runtime value for every value-exported symbol', async () => {
    const repoRoot = path.resolve(process.cwd());
    const platformCorePkgRoot = path.join(repoRoot, 'packages', 'dos-platform-core');
    const platformCoreTsConfigPath = path.join(platformCorePkgRoot, 'tsconfig.json');
    const platformCoreIndexPath = path.join(platformCorePkgRoot, 'src', 'index.ts');

    const config = readTsConfig(platformCoreTsConfigPath);
    const program = ts.createProgram({ rootNames: config.fileNames, options: config.options });
    const checker = program.getTypeChecker();

    const sf = program.getSourceFile(platformCoreIndexPath);
    expect(sf, 'platform-core src/index.ts is part of the TS program').toBeTruthy();
    if (!sf) return;

    const sym = checker.getSymbolAtLocation(sf);
    expect(sym, 'platform-core src/index.ts has a module symbol').toBeTruthy();
    if (!sym) return;

    const exported = checker.getExportsOfModule(sym);
    const valueExportNames = exported
      .filter((s) => (s.flags & ts.SymbolFlags.Value) !== 0)
      .map((s) => s.name)
      .filter((name) => name !== 'default')
      .sort();

    const runtimeModule = await import('../packages/dos-platform-core/src/index.ts');

    for (const name of valueExportNames) {
      expect(name in runtimeModule, `Missing runtime export: ${name}`).toBe(true);
    }
  });
});
