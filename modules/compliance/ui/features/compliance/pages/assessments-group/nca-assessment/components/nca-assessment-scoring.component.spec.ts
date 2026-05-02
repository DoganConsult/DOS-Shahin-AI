import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NcaAssessmentScoringComponent } from './nca-assessment-scoring.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NcaAssessmentScoringComponent', () => {
  let component: NcaAssessmentScoringComponent;
  let fixture: ComponentFixture<NcaAssessmentScoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NcaAssessmentScoringComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NcaAssessmentScoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
