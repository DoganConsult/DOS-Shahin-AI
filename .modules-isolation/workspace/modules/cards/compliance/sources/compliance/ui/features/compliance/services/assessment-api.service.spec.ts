import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssessmentApiService } from './assessment-api.service';

describe('AssessmentApiService', () => {
  let service: AssessmentApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AssessmentApiService
      ]
    });
    service = TestBed.inject(AssessmentApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
