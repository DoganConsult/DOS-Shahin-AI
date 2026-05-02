import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WidgetDataService } from './widget-data.service';

describe('WidgetDataService', () => {
  let service: WidgetDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WidgetDataService
      ]
    });
    service = TestBed.inject(WidgetDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
