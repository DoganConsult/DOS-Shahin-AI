import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SparklineChartComponent } from './sparkline-chart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SparklineChartComponent', () => {
  let component: SparklineChartComponent;
  let fixture: ComponentFixture<SparklineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SparklineChartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SparklineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
