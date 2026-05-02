import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WebsocketNotificationService } from './websocket-notification.service';

describe('WebsocketNotificationService', () => {
  let service: WebsocketNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WebsocketNotificationService
      ]
    });
    service = TestBed.inject(WebsocketNotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
