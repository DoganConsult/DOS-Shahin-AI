import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UnifiedSquadService } from './unified-squad.service';

describe('UnifiedSquadService', () => {
  let service: UnifiedSquadService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UnifiedSquadService
      ]
    });
    service = TestBed.inject(UnifiedSquadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
