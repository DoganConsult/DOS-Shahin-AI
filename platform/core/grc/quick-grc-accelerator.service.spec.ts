import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QuickGrcAcceleratorService } from './quick-grc-accelerator.service';

describe('QuickGrcAcceleratorService', () => {
  let service: QuickGrcAcceleratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        QuickGrcAcceleratorService
      ]
    });
    service = TestBed.inject(QuickGrcAcceleratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
