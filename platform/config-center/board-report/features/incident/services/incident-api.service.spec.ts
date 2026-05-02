import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IncidentApiService } from './incident-api.service';

describe('IncidentApiService', () => {
  let service: IncidentApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        IncidentApiService
      ]
    });
    service = TestBed.inject(IncidentApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
