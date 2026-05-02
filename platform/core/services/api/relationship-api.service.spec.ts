import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RelationshipApiService } from './relationship-api.service';

describe('RelationshipApiService', () => {
  let service: RelationshipApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RelationshipApiService
      ]
    });
    service = TestBed.inject(RelationshipApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
