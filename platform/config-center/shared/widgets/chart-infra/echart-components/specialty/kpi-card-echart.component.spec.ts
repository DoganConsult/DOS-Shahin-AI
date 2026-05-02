import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KpiCardEchartComponent } from './kpi-card-echart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('KpiCardEchartComponent', () => {
  let component: KpiCardEchartComponent;
  let fixture: ComponentFixture<KpiCardEchartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiCardEchartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(KpiCardEchartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
