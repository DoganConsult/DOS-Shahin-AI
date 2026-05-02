import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PackPolicyReviewPageComponent } from './pack-policy-review-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PackPolicyReviewPageComponent', () => {
  let component: PackPolicyReviewPageComponent;
  let fixture: ComponentFixture<PackPolicyReviewPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PackPolicyReviewPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PackPolicyReviewPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
