import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FitchApiService } from './fitch-api.service';

describe('FitchApiService', () => {
  let service: FitchApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FitchApiService
      ]
    });
    service = TestBed.inject(FitchApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
