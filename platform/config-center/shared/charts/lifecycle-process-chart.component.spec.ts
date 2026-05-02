import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LifecycleProcessChartComponent } from './lifecycle-process-chart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LifecycleProcessChartComponent', () => {
  let component: LifecycleProcessChartComponent;
  let fixture: ComponentFixture<LifecycleProcessChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LifecycleProcessChartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(LifecycleProcessChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
