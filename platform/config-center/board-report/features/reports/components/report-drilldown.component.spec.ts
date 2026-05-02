import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportDrilldownComponent } from './report-drilldown.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportDrilldownComponent', () => {
  let component: ReportDrilldownComponent;
  let fixture: ComponentFixture<ReportDrilldownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportDrilldownComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportDrilldownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
