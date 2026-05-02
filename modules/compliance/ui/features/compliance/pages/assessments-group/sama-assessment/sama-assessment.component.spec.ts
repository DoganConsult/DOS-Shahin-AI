import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SamaAssessmentComponent } from './sama-assessment.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SamaAssessmentComponent', () => {
  let component: SamaAssessmentComponent;
  let fixture: ComponentFixture<SamaAssessmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamaAssessmentComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SamaAssessmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
