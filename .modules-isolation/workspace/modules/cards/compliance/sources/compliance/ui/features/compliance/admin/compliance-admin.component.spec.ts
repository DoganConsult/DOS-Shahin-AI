import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComplianceAdminComponent } from './compliance-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ComplianceAdminComponent', () => {
  let component: ComplianceAdminComponent;
  let fixture: ComponentFixture<ComplianceAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ComplianceAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
