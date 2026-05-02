import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowDataService } from './workflow-data.service';

describe('WorkflowDataService', () => {
  let service: WorkflowDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkflowDataService
      ]
    });
    service = TestBed.inject(WorkflowDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
