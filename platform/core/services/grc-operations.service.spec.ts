import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcOperationsService } from './grc-operations.service';

describe('GrcOperationsService', () => {
  let service: GrcOperationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GrcOperationsService
      ]
    });
    service = TestBed.inject(GrcOperationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
