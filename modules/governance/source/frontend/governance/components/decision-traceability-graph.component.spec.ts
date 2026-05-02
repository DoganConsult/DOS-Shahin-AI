import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DecisionTraceabilityGraphComponent } from './decision-traceability-graph.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DecisionTraceabilityGraphComponent', () => {
  let component: DecisionTraceabilityGraphComponent;
  let fixture: ComponentFixture<DecisionTraceabilityGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecisionTraceabilityGraphComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DecisionTraceabilityGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
