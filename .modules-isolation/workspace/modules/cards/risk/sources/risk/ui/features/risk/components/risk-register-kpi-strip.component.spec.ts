import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskRegisterKpiStripComponent } from './risk-register-kpi-strip.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskRegisterKpiStripComponent', () => {
  let component: RiskRegisterKpiStripComponent;
  let fixture: ComponentFixture<RiskRegisterKpiStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskRegisterKpiStripComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskRegisterKpiStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
