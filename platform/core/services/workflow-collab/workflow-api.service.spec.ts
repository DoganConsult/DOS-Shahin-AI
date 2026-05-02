import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowApiService } from './workflow-api.service';

describe('WorkflowApiService', () => {
  let service: WorkflowApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkflowApiService
      ]
    });
    service = TestBed.inject(WorkflowApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
