import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComplianceAssessmentsPageComponent } from './compliance-assessments-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ComplianceAssessmentsPageComponent', () => {
  let component: ComplianceAssessmentsPageComponent;
  let fixture: ComponentFixture<ComplianceAssessmentsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceAssessmentsPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ComplianceAssessmentsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
