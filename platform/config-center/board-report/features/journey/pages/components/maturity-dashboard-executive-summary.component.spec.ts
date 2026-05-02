import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MaturityDashboardExecutiveSummaryComponent } from './maturity-dashboard-executive-summary.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MaturityDashboardExecutiveSummaryComponent', () => {
  let component: MaturityDashboardExecutiveSummaryComponent;
  let fixture: ComponentFixture<MaturityDashboardExecutiveSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaturityDashboardExecutiveSummaryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MaturityDashboardExecutiveSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
