import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowMetricsTabComponent } from './workflow-metrics-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WorkflowMetricsTabComponent', () => {
  let component: WorkflowMetricsTabComponent;
  let fixture: ComponentFixture<WorkflowMetricsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowMetricsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WorkflowMetricsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
