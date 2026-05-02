import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlProcessCycleService } from './control-process-cycle.service';

describe('ControlProcessCycleService', () => {
  let service: ControlProcessCycleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ControlProcessCycleService
      ]
    });
    service = TestBed.inject(ControlProcessCycleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
