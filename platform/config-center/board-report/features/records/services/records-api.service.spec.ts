import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecordsApiService } from './records-api.service';

describe('RecordsApiService', () => {
  let service: RecordsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RecordsApiService
      ]
    });
    service = TestBed.inject(RecordsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
