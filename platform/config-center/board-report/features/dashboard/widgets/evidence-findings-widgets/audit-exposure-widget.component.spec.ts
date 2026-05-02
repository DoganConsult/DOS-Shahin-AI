import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditExposureWidgetComponent } from './audit-exposure-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditExposureWidgetComponent', () => {
  let component: AuditExposureWidgetComponent;
  let fixture: ComponentFixture<AuditExposureWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditExposureWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditExposureWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
