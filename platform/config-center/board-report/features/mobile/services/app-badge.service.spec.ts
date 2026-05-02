import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppBadgeService } from './app-badge.service';

describe('AppBadgeService', () => {
  let service: AppBadgeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AppBadgeService
      ]
    });
    service = TestBed.inject(AppBadgeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
