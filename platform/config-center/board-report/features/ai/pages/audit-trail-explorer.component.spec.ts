import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditTrailExplorerComponent } from './audit-trail-explorer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditTrailExplorerComponent', () => {
  let component: AuditTrailExplorerComponent;
  let fixture: ComponentFixture<AuditTrailExplorerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditTrailExplorerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditTrailExplorerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
