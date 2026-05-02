import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WsLiveBridgeService } from './ws-live-bridge.service';

describe('WsLiveBridgeService', () => {
  let service: WsLiveBridgeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WsLiveBridgeService
      ]
    });
    service = TestBed.inject(WsLiveBridgeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
