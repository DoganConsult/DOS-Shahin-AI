import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HapticService } from './haptic.service';

describe('HapticService', () => {
  let service: HapticService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HapticService
      ]
    });
    service = TestBed.inject(HapticService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
