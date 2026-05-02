import { TestBed } from '@angular/core/testing';
import { ScopeFilterService } from './scope-filter.service';

describe('ScopeFilterService', () => {
  let service: ScopeFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScopeFilterService);
    service.clearAll();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set a filter', () => {
    service.setFilter('region', 'riyadh');
    expect(service.filters()['region']).toBe('riyadh');
  });

  it('should clear a specific filter', () => {
    service.setFilter('region', 'riyadh');
    service.clearFilter('region');
    expect(service.filters()['region']).toBeUndefined();
  });

  it('should clear all filters', () => {
    service.setFilter('region', 'riyadh');
    service.setFilter('dept', 'it');
    service.clearAll();
    expect(Object.keys(service.filters()).length).toBe(0);
  });
});
