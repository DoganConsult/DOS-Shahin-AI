import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ExecutiveWidgetsApi } from './executive-widgets.api.service';

describe('ExecutiveWidgetsApi', () => {
  let service: ExecutiveWidgetsApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ExecutiveWidgetsApi
      ]
    });
    service = TestBed.inject(ExecutiveWidgetsApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
