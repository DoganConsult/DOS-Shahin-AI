import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MaturityDashboardScoreGaugeComponent } from './maturity-dashboard-score-gauge.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MaturityDashboardScoreGaugeComponent', () => {
  let component: MaturityDashboardScoreGaugeComponent;
  let fixture: ComponentFixture<MaturityDashboardScoreGaugeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaturityDashboardScoreGaugeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MaturityDashboardScoreGaugeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
