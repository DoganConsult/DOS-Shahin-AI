import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskAssessmentTableComponent } from './risk-assessment-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskAssessmentTableComponent', () => {
  let component: RiskAssessmentTableComponent;
  let fixture: ComponentFixture<RiskAssessmentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskAssessmentTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskAssessmentTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
