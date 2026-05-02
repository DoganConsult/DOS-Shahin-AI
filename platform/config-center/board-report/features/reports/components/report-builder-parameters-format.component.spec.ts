import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportBuilderParametersFormatComponent } from './report-builder-parameters-format.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportBuilderParametersFormatComponent', () => {
  let component: ReportBuilderParametersFormatComponent;
  let fixture: ComponentFixture<ReportBuilderParametersFormatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportBuilderParametersFormatComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportBuilderParametersFormatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
