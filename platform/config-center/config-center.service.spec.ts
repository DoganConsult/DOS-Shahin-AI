import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigCenterService } from './config-center.service';

describe('ConfigCenterService', () => {
  let service: ConfigCenterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfigCenterService
      ]
    });
    service = TestBed.inject(ConfigCenterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
