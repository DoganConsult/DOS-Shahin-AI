import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActorIdentityService } from './actor-identity.service';

describe('ActorIdentityService', () => {
  let service: ActorIdentityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ActorIdentityService
      ]
    });
    service = TestBed.inject(ActorIdentityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
