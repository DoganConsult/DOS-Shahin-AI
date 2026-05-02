import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditReadinessGaugeComponent } from './audit-readiness-gauge.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditReadinessGaugeComponent', () => {
  let component: AuditReadinessGaugeComponent;
  let fixture: ComponentFixture<AuditReadinessGaugeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditReadinessGaugeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditReadinessGaugeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
