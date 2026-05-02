import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PageAccessService } from './page-access.service';

describe('PageAccessService', () => {
  let service: PageAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PageAccessService
      ]
    });
    service = TestBed.inject(PageAccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
