import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SecureStorageService } from './secure-storage.service';

describe('SecureStorageService', () => {
  let service: SecureStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SecureStorageService
      ]
    });
    service = TestBed.inject(SecureStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
