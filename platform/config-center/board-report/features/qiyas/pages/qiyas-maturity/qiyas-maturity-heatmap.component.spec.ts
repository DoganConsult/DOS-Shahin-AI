import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasMaturityHeatmapComponent } from './qiyas-maturity-heatmap.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasMaturityHeatmapComponent', () => {
  let component: QiyasMaturityHeatmapComponent;
  let fixture: ComponentFixture<QiyasMaturityHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasMaturityHeatmapComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasMaturityHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
