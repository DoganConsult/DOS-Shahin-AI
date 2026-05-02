import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TeamDataService } from './team-data.service';

describe('TeamDataService', () => {
  let service: TeamDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TeamDataService
      ]
    });
    service = TestBed.inject(TeamDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
