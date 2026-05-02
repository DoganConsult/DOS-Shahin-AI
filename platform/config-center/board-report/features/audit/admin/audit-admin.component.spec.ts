import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditAdminComponent } from './audit-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditAdminComponent', () => {
  let component: AuditAdminComponent;
  let fixture: ComponentFixture<AuditAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
