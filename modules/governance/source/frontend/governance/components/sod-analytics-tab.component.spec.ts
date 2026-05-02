import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SodAnalyticsTabComponent } from './sod-analytics-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SodAnalyticsTabComponent', () => {
  let component: SodAnalyticsTabComponent;
  let fixture: ComponentFixture<SodAnalyticsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SodAnalyticsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SodAnalyticsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
