import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatingCockpitService } from './operating-cockpit.service';

describe('OperatingCockpitService', () => {
  let service: OperatingCockpitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OperatingCockpitService
      ]
    });
    service = TestBed.inject(OperatingCockpitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
