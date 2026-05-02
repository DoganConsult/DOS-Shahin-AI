import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AnimatedDonutChartComponent } from './animated-donut-chart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AnimatedDonutChartComponent', () => {
  let component: AnimatedDonutChartComponent;
  let fixture: ComponentFixture<AnimatedDonutChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimatedDonutChartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AnimatedDonutChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
