import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationAccessReviewComponent } from './foundation-access-review.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationAccessReviewComponent', () => {
  let component: FoundationAccessReviewComponent;
  let fixture: ComponentFixture<FoundationAccessReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationAccessReviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationAccessReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
