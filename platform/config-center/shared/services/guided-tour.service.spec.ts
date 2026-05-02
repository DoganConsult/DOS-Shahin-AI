import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GuidedTourService } from './guided-tour.service';

describe('GuidedTourService', () => {
  let service: GuidedTourService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GuidedTourService
      ]
    });
    service = TestBed.inject(GuidedTourService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
