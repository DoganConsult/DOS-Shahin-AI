import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgentBudgetComponent } from './agent-budget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AgentBudgetComponent', () => {
  let component: AgentBudgetComponent;
  let fixture: ComponentFixture<AgentBudgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentBudgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AgentBudgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
