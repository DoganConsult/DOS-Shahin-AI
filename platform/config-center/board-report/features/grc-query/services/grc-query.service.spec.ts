import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcQueryService } from './grc-query.service';

describe('GrcQueryService', () => {
  let service: GrcQueryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GrcQueryService
      ]
    });
    service = TestBed.inject(GrcQueryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
