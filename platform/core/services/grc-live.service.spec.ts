import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcLiveService } from './grc-live.service';

describe('GrcLiveService', () => {
  let service: GrcLiveService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GrcLiveService
      ]
    });
    service = TestBed.inject(GrcLiveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
