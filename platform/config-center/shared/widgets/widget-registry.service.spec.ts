import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WidgetRegistryService } from './widget-registry.service';

describe('WidgetRegistryService', () => {
  let service: WidgetRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WidgetRegistryService
      ]
    });
    service = TestBed.inject(WidgetRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
