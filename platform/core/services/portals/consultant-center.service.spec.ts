import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConsultantCenterService } from './consultant-center.service';

describe('ConsultantCenterService', () => {
  let service: ConsultantCenterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConsultantCenterService
      ]
    });
    service = TestBed.inject(ConsultantCenterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
