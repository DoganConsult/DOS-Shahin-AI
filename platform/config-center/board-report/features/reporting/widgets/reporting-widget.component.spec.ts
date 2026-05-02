import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportingWidgetComponent } from './reporting-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportingWidgetComponent', () => {
  let component: ReportingWidgetComponent;
  let fixture: ComponentFixture<ReportingWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportingWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
