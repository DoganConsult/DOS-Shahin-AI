import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EntityLinkService } from './entity-link.service';

describe('EntityLinkService', () => {
  let service: EntityLinkService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EntityLinkService
      ]
    });
    service = TestBed.inject(EntityLinkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
