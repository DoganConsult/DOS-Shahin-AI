import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleCrudApiService } from './module-crud-api.service';

describe('ModuleCrudApiService', () => {
  let service: ModuleCrudApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ModuleCrudApiService
      ]
    });
    service = TestBed.inject(ModuleCrudApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
