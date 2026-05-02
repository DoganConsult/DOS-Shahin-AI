import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrendLineWidgetComponent } from './trend-line-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TrendLineWidgetComponent', () => {
  let component: TrendLineWidgetComponent;
  let fixture: ComponentFixture<TrendLineWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrendLineWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TrendLineWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
