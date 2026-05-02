import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrainingApiService } from './training-api.service';

describe('TrainingApiService', () => {
  let service: TrainingApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TrainingApiService
      ]
    });
    service = TestBed.inject(TrainingApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
