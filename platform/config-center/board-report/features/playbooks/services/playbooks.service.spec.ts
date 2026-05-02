import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlaybooksService } from './playbooks.service';

describe('PlaybooksService', () => {
  let service: PlaybooksService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlaybooksService
      ]
    });
    service = TestBed.inject(PlaybooksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
