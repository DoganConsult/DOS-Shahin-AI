import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KatexService } from './katex.service';

describe('KatexService', () => {
  let service: KatexService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        KatexService
      ]
    });
    service = TestBed.inject(KatexService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
