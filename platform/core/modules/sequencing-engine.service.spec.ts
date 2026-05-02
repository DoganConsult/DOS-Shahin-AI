import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SequencingEngineService } from './sequencing-engine.service';

describe('SequencingEngineService', () => {
  let service: SequencingEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SequencingEngineService
      ]
    });
    service = TestBed.inject(SequencingEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
