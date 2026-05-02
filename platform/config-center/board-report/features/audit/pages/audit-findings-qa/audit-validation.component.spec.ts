import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditValidationComponent } from './audit-validation.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditValidationComponent', () => {
  let component: AuditValidationComponent;
  let fixture: ComponentFixture<AuditValidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditValidationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditValidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
