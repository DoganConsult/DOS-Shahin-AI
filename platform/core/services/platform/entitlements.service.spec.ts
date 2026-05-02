import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EntitlementsService } from './entitlements.service';

describe('EntitlementsService', () => {
  let service: EntitlementsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EntitlementsService
      ]
    });
    service = TestBed.inject(EntitlementsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
