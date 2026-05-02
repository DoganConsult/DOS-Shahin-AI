import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UiPolicyFacadeService } from './ui-policy-facade.service';

describe('UiPolicyFacadeService', () => {
  let service: UiPolicyFacadeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UiPolicyFacadeService
      ]
    });
    service = TestBed.inject(UiPolicyFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
