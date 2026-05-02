import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditPackageComponent } from './audit-package.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditPackageComponent', () => {
  let component: AuditPackageComponent;
  let fixture: ComponentFixture<AuditPackageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditPackageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditPackageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
