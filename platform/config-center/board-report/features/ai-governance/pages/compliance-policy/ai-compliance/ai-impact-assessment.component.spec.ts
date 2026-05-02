import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiImpactAssessmentComponent } from './ai-impact-assessment.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiImpactAssessmentComponent', () => {
  let component: AiImpactAssessmentComponent;
  let fixture: ComponentFixture<AiImpactAssessmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiImpactAssessmentComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiImpactAssessmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
