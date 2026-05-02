import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NaturalReportQueryComponent } from './natural-report-query.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NaturalReportQueryComponent', () => {
  let component: NaturalReportQueryComponent;
  let fixture: ComponentFixture<NaturalReportQueryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NaturalReportQueryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NaturalReportQueryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
