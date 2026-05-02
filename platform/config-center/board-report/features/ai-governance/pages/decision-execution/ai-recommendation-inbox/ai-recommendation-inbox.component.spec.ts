import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiRecommendationInboxComponent } from './ai-recommendation-inbox.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiRecommendationInboxComponent', () => {
  let component: AiRecommendationInboxComponent;
  let fixture: ComponentFixture<AiRecommendationInboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiRecommendationInboxComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiRecommendationInboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
