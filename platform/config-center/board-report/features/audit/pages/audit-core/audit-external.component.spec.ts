import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditExternalComponent } from './audit-external.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditExternalComponent', () => {
  let component: AuditExternalComponent;
  let fixture: ComponentFixture<AuditExternalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditExternalComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditExternalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
