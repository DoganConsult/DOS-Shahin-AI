import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RegulatorPortalService } from './regulator-portal.service';

describe('RegulatorPortalService', () => {
  let service: RegulatorPortalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RegulatorPortalService
      ]
    });
    service = TestBed.inject(RegulatorPortalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
