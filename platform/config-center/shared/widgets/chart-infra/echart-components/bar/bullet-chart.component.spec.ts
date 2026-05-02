import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BulletChartComponent } from './bullet-chart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BulletChartComponent', () => {
  let component: BulletChartComponent;
  let fixture: ComponentFixture<BulletChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulletChartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BulletChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
