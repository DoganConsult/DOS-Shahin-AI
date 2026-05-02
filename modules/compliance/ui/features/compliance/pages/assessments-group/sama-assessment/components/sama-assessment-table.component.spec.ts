import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SamaAssessmentTableComponent } from './sama-assessment-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SamaAssessmentTableComponent', () => {
  let component: SamaAssessmentTableComponent;
  let fixture: ComponentFixture<SamaAssessmentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamaAssessmentTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SamaAssessmentTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
