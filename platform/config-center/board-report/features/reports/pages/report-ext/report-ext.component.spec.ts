import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportExtComponent } from './report-ext.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportExtComponent', () => {
  let component: ReportExtComponent;
  let fixture: ComponentFixture<ReportExtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportExtComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportExtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
