import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IdleTimeoutService } from './idle-timeout.service';

describe('IdleTimeoutService', () => {
  let service: IdleTimeoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        IdleTimeoutService
      ]
    });
    service = TestBed.inject(IdleTimeoutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
