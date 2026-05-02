import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AutoUpdatingReportComponent } from './auto-updating-report.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AutoUpdatingReportComponent', () => {
  let component: AutoUpdatingReportComponent;
  let fixture: ComponentFixture<AutoUpdatingReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoUpdatingReportComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AutoUpdatingReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
