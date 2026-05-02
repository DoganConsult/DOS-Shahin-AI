import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetApiService } from './asset-api.service';

describe('AssetApiService', () => {
  let service: AssetApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AssetApiService
      ]
    });
    service = TestBed.inject(AssetApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
