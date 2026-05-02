import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskReportsComponent } from './risk-reports.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskReportsComponent', () => {
  let component: RiskReportsComponent;
  let fixture: ComponentFixture<RiskReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskReportsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
