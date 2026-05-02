import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NarrativeSummaryWidgetComponent } from './narrative-summary-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NarrativeSummaryWidgetComponent', () => {
  let component: NarrativeSummaryWidgetComponent;
  let fixture: ComponentFixture<NarrativeSummaryWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NarrativeSummaryWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NarrativeSummaryWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
