import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NcaAssessmentComponent } from './nca-assessment.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NcaAssessmentComponent', () => {
  let component: NcaAssessmentComponent;
  let fixture: ComponentFixture<NcaAssessmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NcaAssessmentComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NcaAssessmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
