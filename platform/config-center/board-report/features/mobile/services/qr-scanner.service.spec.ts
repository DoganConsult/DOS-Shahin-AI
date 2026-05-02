import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QrScannerService } from './qr-scanner.service';

describe('QrScannerService', () => {
  let service: QrScannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        QrScannerService
      ]
    });
    service = TestBed.inject(QrScannerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
