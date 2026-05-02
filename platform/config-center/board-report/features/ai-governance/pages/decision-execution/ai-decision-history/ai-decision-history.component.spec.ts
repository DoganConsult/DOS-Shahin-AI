import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiDecisionHistoryComponent } from './ai-decision-history.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiDecisionHistoryComponent', () => {
  let component: AiDecisionHistoryComponent;
  let fixture: ComponentFixture<AiDecisionHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiDecisionHistoryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiDecisionHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
