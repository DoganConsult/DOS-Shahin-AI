import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditRiskPlanningComponent } from './audit-risk-planning.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditRiskPlanningComponent', () => {
  let component: AuditRiskPlanningComponent;
  let fixture: ComponentFixture<AuditRiskPlanningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditRiskPlanningComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditRiskPlanningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
