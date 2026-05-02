import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { McpAdminApiService } from './mcp-admin-api.service';

describe('McpAdminApiService', () => {
  let service: McpAdminApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        McpAdminApiService
      ]
    });
    service = TestBed.inject(McpAdminApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
