import { TestBed } from '@angular/core/testing';
import { DynamicRegistryService } from './dynamic-registry.service';

describe('DynamicRegistryService', () => {
  let service: DynamicRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DynamicRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
