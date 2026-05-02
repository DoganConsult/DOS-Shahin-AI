import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardEditorService } from './dashboard-editor.service';

describe('DashboardEditorService', () => {
  let service: DashboardEditorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DashboardEditorService
      ]
    });
    service = TestBed.inject(DashboardEditorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
