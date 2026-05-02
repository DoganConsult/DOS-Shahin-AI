import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EvidenceReviewWidgetComponent } from './evidence-review-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EvidenceReviewWidgetComponent', () => {
  let component: EvidenceReviewWidgetComponent;
  let fixture: ComponentFixture<EvidenceReviewWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvidenceReviewWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EvidenceReviewWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
