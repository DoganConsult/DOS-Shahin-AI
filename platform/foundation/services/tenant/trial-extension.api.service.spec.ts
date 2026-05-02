import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrialExtensionApi } from './trial-extension.api.service';

describe('TrialExtensionApi', () => {
  let service: TrialExtensionApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TrialExtensionApi
      ]
    });
    service = TestBed.inject(TrialExtensionApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
