import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormEngineService } from './form-engine.service';

describe('FormEngineService', () => {
  let service: FormEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FormEngineService
      ]
    });
    service = TestBed.inject(FormEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
