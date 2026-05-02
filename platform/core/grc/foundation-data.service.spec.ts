import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationDataService } from './foundation-data.service';

describe('FoundationDataService', () => {
  let service: FoundationDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FoundationDataService
      ]
    });
    service = TestBed.inject(FoundationDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
