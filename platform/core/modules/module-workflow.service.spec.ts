import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleWorkflowService } from './module-workflow.service';

describe('ModuleWorkflowService', () => {
  let service: ModuleWorkflowService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ModuleWorkflowService
      ]
    });
    service = TestBed.inject(ModuleWorkflowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
