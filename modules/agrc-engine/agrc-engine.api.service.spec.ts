import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgrcEngineApi } from './agrc-engine.api.service';

describe('AgrcEngineApi', () => {
  let service: AgrcEngineApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AgrcEngineApi
      ]
    });
    service = TestBed.inject(AgrcEngineApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
