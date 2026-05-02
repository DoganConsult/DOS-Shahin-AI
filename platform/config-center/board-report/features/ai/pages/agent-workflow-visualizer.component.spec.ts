import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgentWorkflowVisualizerComponent } from './agent-workflow-visualizer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AgentWorkflowVisualizerComponent', () => {
  let component: AgentWorkflowVisualizerComponent;
  let fixture: ComponentFixture<AgentWorkflowVisualizerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentWorkflowVisualizerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AgentWorkflowVisualizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
