import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DeploymentProfileService } from './deployment-profile.service';

describe('DeploymentProfileService', () => {
  let service: DeploymentProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DeploymentProfileService
      ]
    });
    service = TestBed.inject(DeploymentProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
