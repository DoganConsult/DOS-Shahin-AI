import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditTestPlansComponent } from './audit-test-plans.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditTestPlansComponent', () => {
  let component: AuditTestPlansComponent;
  let fixture: ComponentFixture<AuditTestPlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditTestPlansComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditTestPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
