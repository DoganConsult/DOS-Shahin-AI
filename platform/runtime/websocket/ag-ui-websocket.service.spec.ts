import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgUiWebsocketService } from './ag-ui-websocket.service';

describe('AgUiWebsocketService', () => {
  let service: AgUiWebsocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AgUiWebsocketService
      ]
    });
    service = TestBed.inject(AgUiWebsocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
