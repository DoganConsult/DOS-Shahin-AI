import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SodService } from './sod.service';

describe('SodService', () => {
  let service: SodService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SodService
      ]
    });
    service = TestBed.inject(SodService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
