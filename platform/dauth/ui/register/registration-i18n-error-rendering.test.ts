import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

const enJson = JSON.parse(readFileSync(resolve(__dirname, '../../..', 'assets/i18n/en.json'), 'utf-8'));
const arJson = JSON.parse(readFileSync(resolve(__dirname, '../../..', 'assets/i18n/ar.json'), 'utf-8'));

const REQUIRED_AUTH_KEYS = [
  'passwordPolicy',
  'registerFailed',
  'passwordMinLength',
  'emailTaken',
  'validationError',
  'orgDomainExists',
  'nameRequired',
  'nameMinLength',
  'passwordRequired',
  'tooManyAttempts',
  'consentLabel',
];

describe('Registration — i18n Error Rendering', () => {
  for (const key of REQUIRED_AUTH_KEYS) {
    it(`en.json has auth.${key}`, () => {
      expect(enJson.auth[key]).toBeTruthy();
      expect(typeof enJson.auth[key]).toBe('string');
    });

    it(`ar.json has auth.${key}`, () => {
      expect(arJson.auth[key]).toBeTruthy();
      expect(typeof arJson.auth[key]).toBe('string');
    });
  }

  it('no raw auth.* keys should leak (all required keys exist in both languages)', () => {
    for (const key of REQUIRED_AUTH_KEYS) {
      const enVal = enJson.auth[key];
      const arVal = arJson.auth[key];
      expect(enVal).not.toBe(`auth.${key}`);
      expect(arVal).not.toBe(`auth.${key}`);
    }
  });
});
