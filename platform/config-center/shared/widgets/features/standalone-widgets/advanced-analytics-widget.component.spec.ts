import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdvancedAnalyticsWidgetComponent } from './advanced-analytics-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AdvancedAnalyticsWidgetComponent', () => {
  let component: AdvancedAnalyticsWidgetComponent;
  let fixture: ComponentFixture<AdvancedAnalyticsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvancedAnalyticsWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AdvancedAnalyticsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
