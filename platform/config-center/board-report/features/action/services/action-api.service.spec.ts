import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActionApiService } from './action-api.service';

describe('ActionApiService', () => {
  let service: ActionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ActionApiService
      ]
    });
    service = TestBed.inject(ActionApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
