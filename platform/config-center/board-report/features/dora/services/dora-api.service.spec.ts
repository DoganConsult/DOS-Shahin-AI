import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraApiService } from './dora-api.service';

describe('DoraApiService', () => {
  let service: DoraApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DoraApiService
      ]
    });
    service = TestBed.inject(DoraApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
