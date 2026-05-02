import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcService } from './grc.service';

describe('GrcService', () => {
  let service: GrcService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GrcService
      ]
    });
    service = TestBed.inject(GrcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
