import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkpaperGeneratorApiService } from './workpaper-generator-api.service';

describe('WorkpaperGeneratorApiService', () => {
  let service: WorkpaperGeneratorApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkpaperGeneratorApiService
      ]
    });
    service = TestBed.inject(WorkpaperGeneratorApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
