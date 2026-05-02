import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditFindingTrendsComponent } from './audit-finding-trends.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditFindingTrendsComponent', () => {
  let component: AuditFindingTrendsComponent;
  let fixture: ComponentFixture<AuditFindingTrendsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditFindingTrendsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditFindingTrendsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
