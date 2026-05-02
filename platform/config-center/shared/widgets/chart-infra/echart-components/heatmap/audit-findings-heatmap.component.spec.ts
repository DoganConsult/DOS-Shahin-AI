import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditFindingsHeatmapComponent } from './audit-findings-heatmap.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditFindingsHeatmapComponent', () => {
  let component: AuditFindingsHeatmapComponent;
  let fixture: ComponentFixture<AuditFindingsHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditFindingsHeatmapComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditFindingsHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
