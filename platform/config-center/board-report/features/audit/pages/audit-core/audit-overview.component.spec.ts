import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditOverviewComponent } from './audit-overview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditOverviewComponent', () => {
  let component: AuditOverviewComponent;
  let fixture: ComponentFixture<AuditOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditOverviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
