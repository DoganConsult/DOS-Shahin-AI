import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasStrategyApiService } from './qiyas-strategy-api.service';

describe('QiyasStrategyApiService', () => {
  let service: QiyasStrategyApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        QiyasStrategyApiService
      ]
    });
    service = TestBed.inject(QiyasStrategyApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
