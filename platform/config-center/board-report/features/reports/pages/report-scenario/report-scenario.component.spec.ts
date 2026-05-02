import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportScenarioComponent } from './report-scenario.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportScenarioComponent', () => {
  let component: ReportScenarioComponent;
  let fixture: ComponentFixture<ReportScenarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportScenarioComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportScenarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
