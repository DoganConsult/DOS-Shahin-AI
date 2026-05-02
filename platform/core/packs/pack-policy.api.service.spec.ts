import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PackPolicyApi } from './pack-policy.api.service';

describe('PackPolicyApi', () => {
  let service: PackPolicyApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PackPolicyApi
      ]
    });
    service = TestBed.inject(PackPolicyApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
