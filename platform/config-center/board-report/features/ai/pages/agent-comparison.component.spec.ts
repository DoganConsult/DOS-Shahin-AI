import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgentComparisonComponent } from './agent-comparison.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AgentComparisonComponent', () => {
  let component: AgentComparisonComponent;
  let fixture: ComponentFixture<AgentComparisonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentComparisonComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AgentComparisonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
