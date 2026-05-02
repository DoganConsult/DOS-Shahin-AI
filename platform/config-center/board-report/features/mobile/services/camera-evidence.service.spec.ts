import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CameraEvidenceService } from './camera-evidence.service';

describe('CameraEvidenceService', () => {
  let service: CameraEvidenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CameraEvidenceService
      ]
    });
    service = TestBed.inject(CameraEvidenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
