import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WidgetContextService } from './widget-context.service';

describe('WidgetContextService', () => {
  let service: WidgetContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WidgetContextService
      ]
    });
    service = TestBed.inject(WidgetContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
