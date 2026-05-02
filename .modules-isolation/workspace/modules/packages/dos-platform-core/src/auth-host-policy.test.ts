import { describe, it, expect } from 'vitest';
import {
  PRODUCT_HOSTS,
  ADMIN_HOST,
  AUTH_HOSTS,
  normalizeHost,
  getAuthSurface,
  isAllowedFrontendHost,
  isRegistrationAllowed,
  isLoginAllowed,
  productBaseUrls,
  adminBaseUrl,
  allAuthOrigins,
  corsAllowedOrigins,
} from './auth-host-policy';

describe('auth-host-policy constants', () => {
  it('defines exactly two product hosts', () => {
    expect([...PRODUCT_HOSTS].sort()).toEqual(['shahin-ai.com', 'www.shahin-ai.com']);
  });

  it('defines admin host', () => {
    expect(ADMIN_HOST).toBe('admin.dogan-ai.com');
  });

  it('AUTH_HOSTS is the union of product hosts and admin host', () => {
    expect([...AUTH_HOSTS].sort()).toEqual(
      ['admin.dogan-ai.com', 'shahin-ai.com', 'www.shahin-ai.com'],
    );
  });
});

describe('normalizeHost', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeHost(null)).toBe('');
    expect(normalizeHost(undefined)).toBe('');
    expect(normalizeHost('')).toBe('');
  });

  it('lowercases', () => {
    expect(normalizeHost('SHAHIN-AI.COM')).toBe('shahin-ai.com');
  });

  it('trims whitespace', () => {
    expect(normalizeHost('  shahin-ai.com  ')).toBe('shahin-ai.com');
  });

  it('takes the first entry from a comma-separated X-Forwarded-Host', () => {
    expect(normalizeHost('shahin-ai.com, 10.0.0.1')).toBe('shahin-ai.com');
  });

  it('strips port', () => {
    expect(normalizeHost('shahin-ai.com:8080')).toBe('shahin-ai.com');
  });

  it('handles combined whitespace + case + port + comma list', () => {
    expect(normalizeHost('  SHAHIN-AI.COM:443 , 10.0.0.1')).toBe('shahin-ai.com');
  });
});

describe('getAuthSurface', () => {
  it('classifies product hosts', () => {
    expect(getAuthSurface('shahin-ai.com')).toBe('product');
    expect(getAuthSurface('www.shahin-ai.com')).toBe('product');
  });

  it('classifies the admin host', () => {
    expect(getAuthSurface('admin.dogan-ai.com')).toBe('admin');
  });

  it('rejects dogan-ai.com as unsupported (not in auth flow)', () => {
    expect(getAuthSurface('dogan-ai.com')).toBe('unsupported');
    expect(getAuthSurface('www.dogan-ai.com')).toBe('unsupported');
  });

  it('rejects arbitrary hosts', () => {
    expect(getAuthSurface('evil.example.com')).toBe('unsupported');
    expect(getAuthSurface('')).toBe('unsupported');
  });

  it('is case-strict — callers must normalize first', () => {
    expect(getAuthSurface('SHAHIN-AI.COM')).toBe('unsupported');
    expect(getAuthSurface(normalizeHost('SHAHIN-AI.COM'))).toBe('product');
  });
});

describe('isAllowedFrontendHost', () => {
  it('accepts all three auth hosts', () => {
    expect(isAllowedFrontendHost('shahin-ai.com')).toBe(true);
    expect(isAllowedFrontendHost('www.shahin-ai.com')).toBe(true);
    expect(isAllowedFrontendHost('admin.dogan-ai.com')).toBe(true);
  });

  it('rejects non-auth hosts', () => {
    expect(isAllowedFrontendHost('dogan-ai.com')).toBe(false);
    expect(isAllowedFrontendHost('www.dogan-ai.com')).toBe(false);
    expect(isAllowedFrontendHost('evil.example.com')).toBe(false);
  });
});

describe('isRegistrationAllowed', () => {
  it('allows product hosts', () => {
    expect(isRegistrationAllowed('shahin-ai.com')).toBe(true);
    expect(isRegistrationAllowed('www.shahin-ai.com')).toBe(true);
  });

  it('blocks admin host', () => {
    expect(isRegistrationAllowed('admin.dogan-ai.com')).toBe(false);
  });

  it('blocks unknown hosts', () => {
    expect(isRegistrationAllowed('dogan-ai.com')).toBe(false);
    expect(isRegistrationAllowed('evil.example.com')).toBe(false);
  });
});

describe('isLoginAllowed', () => {
  it('allows product + admin', () => {
    expect(isLoginAllowed('shahin-ai.com')).toBe(true);
    expect(isLoginAllowed('www.shahin-ai.com')).toBe(true);
    expect(isLoginAllowed('admin.dogan-ai.com')).toBe(true);
  });

  it('blocks unsupported hosts', () => {
    expect(isLoginAllowed('dogan-ai.com')).toBe(false);
    expect(isLoginAllowed('evil.example.com')).toBe(false);
  });
});

describe('derived URL helpers', () => {
  it('productBaseUrls defaults to https', () => {
    expect(productBaseUrls().sort()).toEqual(
      ['https://shahin-ai.com', 'https://www.shahin-ai.com'],
    );
  });

  it('productBaseUrls supports wss', () => {
    expect(productBaseUrls('wss').sort()).toEqual(
      ['wss://shahin-ai.com', 'wss://www.shahin-ai.com'],
    );
  });

  it('adminBaseUrl defaults to https', () => {
    expect(adminBaseUrl()).toBe('https://admin.dogan-ai.com');
  });

  it('corsAllowedOrigins returns the three https auth origins', () => {
    expect(corsAllowedOrigins().sort()).toEqual([
      'https://admin.dogan-ai.com',
      'https://shahin-ai.com',
      'https://www.shahin-ai.com',
    ]);
  });

  it('allAuthOrigins([https, wss]) returns six distinct origins', () => {
    const origins = allAuthOrigins(['https', 'wss']);
    expect(origins).toHaveLength(6);
    expect(new Set(origins).size).toBe(6);
    expect(origins).toContain('https://shahin-ai.com');
    expect(origins).toContain('https://www.shahin-ai.com');
    expect(origins).toContain('https://admin.dogan-ai.com');
    expect(origins).toContain('wss://shahin-ai.com');
    expect(origins).toContain('wss://www.shahin-ai.com');
    expect(origins).toContain('wss://admin.dogan-ai.com');
  });

  it('allAuthOrigins dedupes if a proto is passed twice', () => {
    const origins = allAuthOrigins(['https', 'https']);
    expect(origins).toHaveLength(3);
  });
});
