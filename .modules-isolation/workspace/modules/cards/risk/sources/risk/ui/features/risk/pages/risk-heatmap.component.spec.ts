import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskHeatmapComponent } from './risk-heatmap.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskHeatmapComponent', () => {
  let component: RiskHeatmapComponent;
  let fixture: ComponentFixture<RiskHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskHeatmapComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
