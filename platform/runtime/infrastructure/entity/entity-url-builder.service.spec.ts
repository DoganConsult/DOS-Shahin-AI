import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EntityUrlBuilderService } from './entity-url-builder.service';

describe('EntityUrlBuilderService', () => {
  let service: EntityUrlBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EntityUrlBuilderService
      ]
    });
    service = TestBed.inject(EntityUrlBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
