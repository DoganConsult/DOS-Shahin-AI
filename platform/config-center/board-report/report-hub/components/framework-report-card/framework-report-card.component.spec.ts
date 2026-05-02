import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FrameworkReportCardComponent } from './framework-report-card.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FrameworkReportCardComponent', () => {
  let component: FrameworkReportCardComponent;
  let fixture: ComponentFixture<FrameworkReportCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameworkReportCardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FrameworkReportCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
