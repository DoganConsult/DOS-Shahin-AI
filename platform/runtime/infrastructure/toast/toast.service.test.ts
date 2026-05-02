import 'zone.js';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { MessageService } from 'primeng/api';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let msgService: MessageService;

  beforeAll(() => {
    try { TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting()); } catch {}
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MessageService, ToastService],
    });
    service = TestBed.inject(ToastService);
    msgService = TestBed.inject(MessageService);
    vi.spyOn(msgService, 'add');
  });

  it('should show success toast', () => {
    service.success('Saved successfully');
    expect(msgService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Saved successfully' }));
  });

  it('should show error toast', () => {
    service.error('Something went wrong');
    expect(msgService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'Something went wrong' }));
  });

  it('should show warning toast', () => {
    service.warn('Check input');
    expect(msgService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn', detail: 'Check input' }));
  });

  it('should show info toast', () => {
    service.info('FYI');
    expect(msgService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'info', detail: 'FYI' }));
  });
});
