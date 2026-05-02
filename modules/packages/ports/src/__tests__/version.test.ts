import { describe, expect, it } from 'vitest';
import { PORTS_VERSION, MODULE_PORTS_VERSION, assertPortsCompatible } from '../version';

describe('@dos/ports version contract', () => {
  it('PORTS_VERSION follows semver', () => {
    expect(PORTS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('declares versions for all four platform modules', () => {
    expect(Object.keys(MODULE_PORTS_VERSION).sort()).toEqual(
      ['dauth', 'dnoc', 'dos', 'dsoc'],
    );
  });

  it('every module version follows semver', () => {
    for (const v of Object.values(MODULE_PORTS_VERSION)) {
      expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('assertPortsCompatible passes for matching major', () => {
    expect(() => assertPortsCompatible('dauth', '1.0')).not.toThrow();
    expect(() => assertPortsCompatible('dauth', '1.0.0')).not.toThrow();
  });

  it('assertPortsCompatible throws on major mismatch with actionable message', () => {
    expect(() => assertPortsCompatible('dauth', '2.0')).toThrow(
      /major version mismatch.*consumer expects 2\.0.*loaded 1\.0\.0/,
    );
  });

  it('assertPortsCompatible throws if consumer needs a higher minor', () => {
    expect(() => assertPortsCompatible('dauth', '1.99')).toThrow(
      /minor version too low.*consumer expects >= 1\.99.*loaded 1\.0\.0/,
    );
  });
});
