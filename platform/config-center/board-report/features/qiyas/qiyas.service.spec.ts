import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasService } from './qiyas.service';

describe('QiyasService', () => {
  let service: QiyasService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        QiyasService
      ]
    });
    service = TestBed.inject(QiyasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
