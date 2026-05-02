import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskScoreHistoryComponent } from './risk-score-history.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskScoreHistoryComponent', () => {
  let component: RiskScoreHistoryComponent;
  let fixture: ComponentFixture<RiskScoreHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskScoreHistoryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskScoreHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
