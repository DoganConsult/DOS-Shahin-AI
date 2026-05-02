import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcPermissionService } from './grc-permission.service';

describe('GrcPermissionService', () => {
  let service: GrcPermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GrcPermissionService
      ]
    });
    service = TestBed.inject(GrcPermissionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
