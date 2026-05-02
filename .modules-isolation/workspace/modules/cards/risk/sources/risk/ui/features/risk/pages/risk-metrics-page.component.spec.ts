import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskMetricsPageComponent } from './risk-metrics-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskMetricsPageComponent', () => {
  let component: RiskMetricsPageComponent;
  let fixture: ComponentFixture<RiskMetricsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskMetricsPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskMetricsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
