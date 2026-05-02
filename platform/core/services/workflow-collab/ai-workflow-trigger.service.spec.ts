import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiWorkflowTriggerService } from './ai-workflow-trigger.service';

describe('AiWorkflowTriggerService', () => {
  let service: AiWorkflowTriggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiWorkflowTriggerService
      ]
    });
    service = TestBed.inject(AiWorkflowTriggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
