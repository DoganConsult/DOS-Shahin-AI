import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ScoringPoliciesComponent } from './scoring-policies.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ScoringPoliciesComponent', () => {
  let component: ScoringPoliciesComponent;
  let fixture: ComponentFixture<ScoringPoliciesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoringPoliciesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ScoringPoliciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
