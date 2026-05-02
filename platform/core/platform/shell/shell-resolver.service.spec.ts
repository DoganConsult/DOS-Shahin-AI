import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ShellResolverService } from './shell-resolver.service';

describe('ShellResolverService', () => {
  let service: ShellResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ShellResolverService
      ]
    });
    service = TestBed.inject(ShellResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
