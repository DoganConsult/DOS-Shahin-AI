import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GuidedExperienceService } from './guided-experience.service';

describe('GuidedExperienceService', () => {
  let service: GuidedExperienceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GuidedExperienceService
      ]
    });
    service = TestBed.inject(GuidedExperienceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
