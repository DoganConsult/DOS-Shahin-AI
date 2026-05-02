import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MaturityRadarEchartComponent } from './maturity-radar-echart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MaturityRadarEchartComponent', () => {
  let component: MaturityRadarEchartComponent;
  let fixture: ComponentFixture<MaturityRadarEchartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaturityRadarEchartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MaturityRadarEchartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
