import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportHubComponent } from './report-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportHubComponent', () => {
  let component: ReportHubComponent;
  let fixture: ComponentFixture<ReportHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
