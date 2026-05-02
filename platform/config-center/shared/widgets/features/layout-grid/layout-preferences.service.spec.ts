import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LayoutPreferencesService } from './layout-preferences.service';

describe('LayoutPreferencesService', () => {
  let service: LayoutPreferencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        LayoutPreferencesService
      ]
    });
    service = TestBed.inject(LayoutPreferencesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
