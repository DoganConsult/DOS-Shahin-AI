import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { XstateService } from './xstate.service';

describe('XstateService', () => {
  let service: XstateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        XstateService
      ]
    });
    service = TestBed.inject(XstateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
