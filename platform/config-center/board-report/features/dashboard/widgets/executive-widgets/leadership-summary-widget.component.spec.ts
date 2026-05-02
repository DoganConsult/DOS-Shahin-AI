import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LeadershipSummaryWidgetComponent } from './leadership-summary-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LeadershipSummaryWidgetComponent', () => {
  let component: LeadershipSummaryWidgetComponent;
  let fixture: ComponentFixture<LeadershipSummaryWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadershipSummaryWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(LeadershipSummaryWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
