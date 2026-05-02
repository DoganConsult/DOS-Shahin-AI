import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationDerivationService } from './navigation-derivation.service';

describe('NavigationDerivationService', () => {
  let service: NavigationDerivationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NavigationDerivationService
      ]
    });
    service = TestBed.inject(NavigationDerivationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
