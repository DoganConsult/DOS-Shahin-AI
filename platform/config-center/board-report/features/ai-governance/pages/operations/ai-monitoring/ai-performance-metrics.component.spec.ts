import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiPerformanceMetricsComponent } from './ai-performance-metrics.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiPerformanceMetricsComponent', () => {
  let component: AiPerformanceMetricsComponent;
  let fixture: ComponentFixture<AiPerformanceMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPerformanceMetricsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiPerformanceMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
