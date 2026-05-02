import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskHeatmapCellDetailComponent } from './risk-heatmap-cell-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskHeatmapCellDetailComponent', () => {
  let component: RiskHeatmapCellDetailComponent;
  let fixture: ComponentFixture<RiskHeatmapCellDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskHeatmapCellDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskHeatmapCellDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
