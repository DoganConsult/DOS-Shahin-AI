import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardEditorApi } from './dashboard-editor.api.service';

describe('DashboardEditorApi', () => {
  let service: DashboardEditorApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DashboardEditorApi
      ]
    });
    service = TestBed.inject(DashboardEditorApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
