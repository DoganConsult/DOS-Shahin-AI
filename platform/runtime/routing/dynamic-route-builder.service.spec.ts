import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DynamicRouteBuilderService } from './dynamic-route-builder.service';

describe('DynamicRouteBuilderService', () => {
  let service: DynamicRouteBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DynamicRouteBuilderService
      ]
    });
    service = TestBed.inject(DynamicRouteBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
