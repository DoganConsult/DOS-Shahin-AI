import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsApiService } from './controls-api.service';

describe('ControlsApiService', () => {
  let service: ControlsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ControlsApiService
      ]
    });
    service = TestBed.inject(ControlsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
