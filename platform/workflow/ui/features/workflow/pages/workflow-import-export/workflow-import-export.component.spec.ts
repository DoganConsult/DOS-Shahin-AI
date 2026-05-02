import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowImportExportComponent } from './workflow-import-export.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WorkflowImportExportComponent', () => {
  let component: WorkflowImportExportComponent;
  let fixture: ComponentFixture<WorkflowImportExportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowImportExportComponent], // Assuming standalone component
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } },
            params: of({ id: '1' }),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowImportExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
