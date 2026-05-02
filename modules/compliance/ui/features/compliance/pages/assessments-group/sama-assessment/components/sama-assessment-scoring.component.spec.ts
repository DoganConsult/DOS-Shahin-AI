import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SamaAssessmentScoringComponent } from './sama-assessment-scoring.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SamaAssessmentScoringComponent', () => {
  let component: SamaAssessmentScoringComponent;
  let fixture: ComponentFixture<SamaAssessmentScoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamaAssessmentScoringComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SamaAssessmentScoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
