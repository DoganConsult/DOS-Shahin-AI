import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowExtComponent } from './workflow-ext.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WorkflowExtComponent', () => {
  let component: WorkflowExtComponent;
  let fixture: ComponentFixture<WorkflowExtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowExtComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WorkflowExtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
