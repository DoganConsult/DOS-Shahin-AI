import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PacksApiService } from './packs-api.service';

describe('PacksApiService', () => {
  let service: PacksApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PacksApiService
      ]
    });
    service = TestBed.inject(PacksApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
