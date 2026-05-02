import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProgressRingChartComponent } from './progress-ring-chart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ProgressRingChartComponent', () => {
  let component: ProgressRingChartComponent;
  let fixture: ComponentFixture<ProgressRingChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressRingChartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ProgressRingChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
