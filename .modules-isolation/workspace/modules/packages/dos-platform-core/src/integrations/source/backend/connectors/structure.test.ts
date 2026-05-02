import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('connectors module structure', () => {
  const moduleDir = path.resolve(__dirname);

  it('has AS-BUILT.md', () => {
    expect(fs.existsSync(path.join(moduleDir, 'AS-BUILT.md'))).toBe(true);
  });

  it('has i18n directory', () => {
    expect(fs.existsSync(path.join(moduleDir, 'i18n'))).toBe(true);
  });
});
