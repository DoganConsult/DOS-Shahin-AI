import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditReportComponent } from './audit-report.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditReportComponent', () => {
  let component: AuditReportComponent;
  let fixture: ComponentFixture<AuditReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditReportComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
