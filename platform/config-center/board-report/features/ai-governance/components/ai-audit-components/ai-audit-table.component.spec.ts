import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAuditTableComponent } from './ai-audit-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAuditTableComponent', () => {
  let component: AiAuditTableComponent;
  let fixture: ComponentFixture<AiAuditTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAuditTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAuditTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
