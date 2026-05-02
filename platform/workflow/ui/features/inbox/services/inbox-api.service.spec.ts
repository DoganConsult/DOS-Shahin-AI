import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InboxApiService } from './inbox-api.service';

describe('InboxApiService', () => {
  let service: InboxApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InboxApiService
      ]
    });
    service = TestBed.inject(InboxApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
