import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasApiService } from './qiyas-api.service';

describe('QiyasApiService', () => {
  let service: QiyasApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        QiyasApiService
      ]
    });
    service = TestBed.inject(QiyasApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
