import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ExceptionApiService } from './exception-api.service';

describe('ExceptionApiService', () => {
  let service: ExceptionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ExceptionApiService
      ]
    });
    service = TestBed.inject(ExceptionApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
