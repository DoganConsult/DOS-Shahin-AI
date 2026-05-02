import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditSchedulesComponent } from './audit-schedules.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditSchedulesComponent', () => {
  let component: AuditSchedulesComponent;
  let fixture: ComponentFixture<AuditSchedulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditSchedulesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditSchedulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
