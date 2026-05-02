import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiRecommendationListComponent } from './ai-recommendation-list.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiRecommendationListComponent', () => {
  let component: AiRecommendationListComponent;
  let fixture: ComponentFixture<AiRecommendationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiRecommendationListComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiRecommendationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
