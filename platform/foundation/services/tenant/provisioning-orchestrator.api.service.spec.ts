import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProvisioningOrchestratorApi } from './provisioning-orchestrator.api.service';

describe('ProvisioningOrchestratorApi', () => {
  let service: ProvisioningOrchestratorApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProvisioningOrchestratorApi
      ]
    });
    service = TestBed.inject(ProvisioningOrchestratorApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
