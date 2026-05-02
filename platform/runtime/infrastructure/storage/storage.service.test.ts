import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '@app/infrastructure';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    service = new StorageService();
  });

  it('should get and set string values', () => {
    service.set('key1', 'value1');
    expect(service.get('key1')).toBe('value1');
  });

  it('should return null for missing keys', () => {
    expect(service.get('nonexistent')).toBeNull();
  });

  it('should get and set JSON values', () => {
    const data = { name: 'test', count: 42 };
    service.setJSON('json1', data);
    expect(service.getJSON('json1')).toEqual(data);
  });

  it('should return fallback for missing JSON keys', () => {
    expect(service.getJSON('missing', { default: true })).toEqual({ default: true });
  });

  it('should remove values', () => {
    service.set('key1', 'value1');
    service.remove('key1');
    expect(service.get('key1')).toBeNull();
  });

  it('should clear all values', () => {
    service.set('a', '1');
    service.set('b', '2');
    service.clear();
    expect(service.get('a')).toBeNull();
    expect(service.get('b')).toBeNull();
  });

  it('should support session storage', () => {
    service.set('sess', 'val', 'session');
    expect(service.get('sess', 'session')).toBe('val');
    expect(service.get('sess', 'local')).toBeNull();
  });
});
