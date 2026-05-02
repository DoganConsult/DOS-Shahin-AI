import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskHeatmapCanvasComponent } from './risk-heatmap-canvas.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskHeatmapCanvasComponent', () => {
  let component: RiskHeatmapCanvasComponent;
  let fixture: ComponentFixture<RiskHeatmapCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskHeatmapCanvasComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskHeatmapCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
