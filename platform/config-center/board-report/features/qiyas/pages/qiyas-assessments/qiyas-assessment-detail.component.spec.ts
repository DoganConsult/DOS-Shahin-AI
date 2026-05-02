import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasAssessmentDetailComponent } from './qiyas-assessment-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasAssessmentDetailComponent', () => {
  let component: QiyasAssessmentDetailComponent;
  let fixture: ComponentFixture<QiyasAssessmentDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasAssessmentDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasAssessmentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
