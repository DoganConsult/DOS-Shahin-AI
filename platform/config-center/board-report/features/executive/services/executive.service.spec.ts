import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ExecutiveService } from './executive.service';

describe('ExecutiveService', () => {
  let service: ExecutiveService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ExecutiveService
      ]
    });
    service = TestBed.inject(ExecutiveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
