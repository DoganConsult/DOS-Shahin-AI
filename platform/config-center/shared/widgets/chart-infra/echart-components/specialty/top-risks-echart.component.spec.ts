import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TopRisksEchartComponent } from './top-risks-echart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TopRisksEchartComponent', () => {
  let component: TopRisksEchartComponent;
  let fixture: ComponentFixture<TopRisksEchartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopRisksEchartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TopRisksEchartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
