import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MobileInitService } from './mobile-init.service';

describe('MobileInitService', () => {
  let service: MobileInitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MobileInitService
      ]
    });
    service = TestBed.inject(MobileInitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
