import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiHitlReviewQueueComponent } from './ai-hitl-review-queue.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiHitlReviewQueueComponent', () => {
  let component: AiHitlReviewQueueComponent;
  let fixture: ComponentFixture<AiHitlReviewQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiHitlReviewQueueComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiHitlReviewQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
