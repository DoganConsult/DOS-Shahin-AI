import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleKickstartService } from './module-kickstart.service';

describe('ModuleKickstartService', () => {
  let service: ModuleKickstartService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ModuleKickstartService
      ]
    });
    service = TestBed.inject(ModuleKickstartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
