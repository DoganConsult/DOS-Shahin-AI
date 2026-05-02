import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get a value', () => {
    service.set('test-key', 'test-value');
    expect(service.get('test-key')).toBe('test-value');
  });

  it('should return null for missing key', () => {
    expect(service.get('nonexistent')).toBeNull();
  });

  it('should remove a key', () => {
    service.set('remove-key', 'value');
    service.remove('remove-key');
    expect(service.get('remove-key')).toBeNull();
  });

  it('should clear all storage', () => {
    service.set('key1', 'v1');
    service.set('key2', 'v2');
    service.clear();
    expect(service.get('key1')).toBeNull();
    expect(service.get('key2')).toBeNull();
  });
});
