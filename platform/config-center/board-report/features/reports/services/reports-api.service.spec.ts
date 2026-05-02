import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportsApiService } from './reports-api.service';

describe('ReportsApiService', () => {
  let service: ReportsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportsApiService
      ]
    });
    service = TestBed.inject(ReportsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
