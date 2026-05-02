import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WebsocketClientService } from './websocket-client.service';

describe('WebsocketClientService', () => {
  let service: WebsocketClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WebsocketClientService
      ]
    });
    service = TestBed.inject(WebsocketClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
