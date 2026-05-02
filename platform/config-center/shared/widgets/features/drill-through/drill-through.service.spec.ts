import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DrillThroughService } from './drill-through.service';

describe('DrillThroughService', () => {
  let service: DrillThroughService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DrillThroughService
      ]
    });
    service = TestBed.inject(DrillThroughService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
