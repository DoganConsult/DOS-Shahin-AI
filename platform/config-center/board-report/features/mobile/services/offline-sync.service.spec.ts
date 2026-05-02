import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OfflineSyncService } from './offline-sync.service';

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OfflineSyncService
      ]
    });
    service = TestBed.inject(OfflineSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
