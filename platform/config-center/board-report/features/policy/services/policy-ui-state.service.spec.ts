import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyUiStateService } from './policy-ui-state.service';

describe('PolicyUiStateService', () => {
  let service: PolicyUiStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PolicyUiStateService
      ]
    });
    service = TestBed.inject(PolicyUiStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
