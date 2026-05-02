import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IntegrationsApiService } from './integrations-api.service';

describe('IntegrationsApiService', () => {
  let service: IntegrationsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        IntegrationsApiService
      ]
    });
    service = TestBed.inject(IntegrationsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
