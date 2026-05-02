import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ScopeService } from './scope.service';

describe('ScopeService', () => {
  let service: ScopeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ScopeService
      ]
    });
    service = TestBed.inject(ScopeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
