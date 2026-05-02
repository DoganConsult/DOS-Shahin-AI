import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Workflow-3levelApiService } from './workflow-3level-api.service';

describe('Workflow-3levelApiService', () => {
  let service: Workflow-3levelApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        Workflow-3levelApiService
      ]
    });
    service = TestBed.inject(Workflow-3levelApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
