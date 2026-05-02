import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SeverityService } from './severity.service';

describe('SeverityService', () => {
  let service: SeverityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SeverityService
      ]
    });
    service = TestBed.inject(SeverityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
