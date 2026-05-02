import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MaturityDashboardPhaseProgressComponent } from './maturity-dashboard-phase-progress.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MaturityDashboardPhaseProgressComponent', () => {
  let component: MaturityDashboardPhaseProgressComponent;
  let fixture: ComponentFixture<MaturityDashboardPhaseProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaturityDashboardPhaseProgressComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MaturityDashboardPhaseProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
