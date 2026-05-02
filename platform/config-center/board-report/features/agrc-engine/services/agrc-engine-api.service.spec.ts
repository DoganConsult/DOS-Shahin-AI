import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgrcEngineApiService } from './agrc-engine-api.service';

describe('AgrcEngineApiService', () => {
  let service: AgrcEngineApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AgrcEngineApiService
      ]
    });
    service = TestBed.inject(AgrcEngineApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
