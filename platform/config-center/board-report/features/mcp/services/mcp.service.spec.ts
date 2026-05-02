import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { McpService } from './mcp.service';

describe('McpService', () => {
  let service: McpService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        McpService
      ]
    });
    service = TestBed.inject(McpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
