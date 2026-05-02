import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RegulatorHeatmapComponent } from './regulator-heatmap.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RegulatorHeatmapComponent', () => {
  let component: RegulatorHeatmapComponent;
  let fixture: ComponentFixture<RegulatorHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegulatorHeatmapComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RegulatorHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
