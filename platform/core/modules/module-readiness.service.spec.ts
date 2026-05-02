import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleReadinessService } from './module-readiness.service';

describe('ModuleReadinessService', () => {
  let service: ModuleReadinessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ModuleReadinessService
      ]
    });
    service = TestBed.inject(ModuleReadinessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
