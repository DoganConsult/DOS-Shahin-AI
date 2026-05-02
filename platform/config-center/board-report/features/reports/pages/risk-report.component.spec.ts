import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskReportComponent } from './risk-report.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskReportComponent', () => {
  let component: RiskReportComponent;
  let fixture: ComponentFixture<RiskReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskReportComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
