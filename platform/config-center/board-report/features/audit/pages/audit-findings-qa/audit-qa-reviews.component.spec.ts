import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditQaReviewsComponent } from './audit-qa-reviews.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditQaReviewsComponent', () => {
  let component: AuditQaReviewsComponent;
  let fixture: ComponentFixture<AuditQaReviewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditQaReviewsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditQaReviewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
