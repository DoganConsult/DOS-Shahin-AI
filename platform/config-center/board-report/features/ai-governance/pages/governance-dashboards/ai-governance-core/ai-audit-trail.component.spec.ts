import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAuditTrailComponent } from './ai-audit-trail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAuditTrailComponent', () => {
  let component: AiAuditTrailComponent;
  let fixture: ComponentFixture<AiAuditTrailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAuditTrailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAuditTrailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
