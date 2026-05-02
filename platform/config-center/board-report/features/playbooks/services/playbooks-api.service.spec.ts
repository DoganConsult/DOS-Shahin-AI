import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlaybooksApiService } from './playbooks-api.service';

describe('PlaybooksApiService', () => {
  let service: PlaybooksApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlaybooksApiService
      ]
    });
    service = TestBed.inject(PlaybooksApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
