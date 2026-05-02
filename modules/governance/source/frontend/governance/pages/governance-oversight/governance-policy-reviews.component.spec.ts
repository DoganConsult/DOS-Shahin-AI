import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GovernancePolicyReviewsComponent } from './governance-policy-reviews.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GovernancePolicyReviewsComponent', () => {
  let component: GovernancePolicyReviewsComponent;
  let fixture: ComponentFixture<GovernancePolicyReviewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GovernancePolicyReviewsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GovernancePolicyReviewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
