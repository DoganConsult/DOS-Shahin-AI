import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChartCarouselComponent } from './chart-carousel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ChartCarouselComponent', () => {
  let component: ChartCarouselComponent;
  let fixture: ComponentFixture<ChartCarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartCarouselComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ChartCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
