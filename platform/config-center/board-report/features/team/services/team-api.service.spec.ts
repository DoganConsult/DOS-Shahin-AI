import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TeamApiService } from './team-api.service';

describe('TeamApiService', () => {
  let service: TeamApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TeamApiService
      ]
    });
    service = TestBed.inject(TeamApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
