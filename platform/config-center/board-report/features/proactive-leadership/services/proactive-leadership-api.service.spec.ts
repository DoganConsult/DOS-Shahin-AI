import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProactiveLeadershipApiService } from './proactive-leadership-api.service';

describe('ProactiveLeadershipApiService', () => {
  let service: ProactiveLeadershipApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProactiveLeadershipApiService
      ]
    });
    service = TestBed.inject(ProactiveLeadershipApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
