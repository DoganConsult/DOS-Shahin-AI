import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskHeatmapEchartComponent } from './risk-heatmap-echart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskHeatmapEchartComponent', () => {
  let component: RiskHeatmapEchartComponent;
  let fixture: ComponentFixture<RiskHeatmapEchartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskHeatmapEchartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskHeatmapEchartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
