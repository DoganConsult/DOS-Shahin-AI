import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApprovalsApiService } from './approvals-api.service';

describe('ApprovalsApiService', () => {
  let service: ApprovalsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApprovalsApiService
      ]
    });
    service = TestBed.inject(ApprovalsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
