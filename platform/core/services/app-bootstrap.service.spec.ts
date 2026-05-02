import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppBootstrapService } from './app-bootstrap.service';

describe('AppBootstrapService', () => {
  let service: AppBootstrapService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AppBootstrapService
      ]
    });
    service = TestBed.inject(AppBootstrapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
