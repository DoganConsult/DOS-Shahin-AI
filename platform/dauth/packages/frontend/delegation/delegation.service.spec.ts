import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DelegationService } from './delegation.service';

describe('DelegationService', () => {
  let service: DelegationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DelegationService
      ]
    });
    service = TestBed.inject(DelegationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
