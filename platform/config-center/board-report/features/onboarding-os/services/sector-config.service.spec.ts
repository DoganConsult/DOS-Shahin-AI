import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SectorConfigService } from './sector-config.service';

describe('SectorConfigService', () => {
  let service: SectorConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SectorConfigService
      ]
    });
    service = TestBed.inject(SectorConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
