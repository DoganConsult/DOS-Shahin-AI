import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FitchService } from './fitch.service';

describe('FitchService', () => {
  let service: FitchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FitchService
      ]
    });
    service = TestBed.inject(FitchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
