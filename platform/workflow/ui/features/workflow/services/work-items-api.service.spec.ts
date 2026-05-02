import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkItemsApiService } from './work-items-api.service';

describe('WorkItemsApiService', () => {
  let service: WorkItemsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkItemsApiService
      ]
    });
    service = TestBed.inject(WorkItemsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
