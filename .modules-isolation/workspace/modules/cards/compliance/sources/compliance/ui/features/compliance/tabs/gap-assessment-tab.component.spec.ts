import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GapAssessmentTabComponent } from './gap-assessment-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GapAssessmentTabComponent', () => {
  let component: GapAssessmentTabComponent;
  let fixture: ComponentFixture<GapAssessmentTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GapAssessmentTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GapAssessmentTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
