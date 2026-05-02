import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
  let service: ConnectivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConnectivityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should report online status', () => {
    expect(typeof service.isOnline()).toBe('boolean');
  });

  it('should report offline status', () => {
    expect(typeof service.isOffline()).toBe('boolean');
  });

  it('should have online signal', () => {
    expect(service.online()).toBeDefined();
  });

  it('should clean up on destroy', () => {
    service.ngOnDestroy();
  });
});
