import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IssuesApiService } from './issues-api.service';

describe('IssuesApiService', () => {
  let service: IssuesApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        IssuesApiService
      ]
    });
    service = TestBed.inject(IssuesApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
