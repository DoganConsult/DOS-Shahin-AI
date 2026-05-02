import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    service.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show a success toast', () => {
    service.success('Done', 'Operation succeeded');
    expect(service.messages().length).toBeGreaterThan(0);
  });

  it('should show an error toast', () => {
    service.error('Failed', 'Something went wrong');
    expect(service.messages().length).toBeGreaterThan(0);
  });

  it('should show a warning toast', () => {
    service.warn('Caution');
    expect(service.messages().length).toBeGreaterThan(0);
  });

  it('should show an info toast', () => {
    service.info('FYI');
    expect(service.messages().length).toBeGreaterThan(0);
  });

  it('should clear all toasts', () => {
    service.success('test');
    service.error('test');
    service.clear();
    expect(service.messages().length).toBe(0);
  });
});
