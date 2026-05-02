import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProactiveLeadershipDashboardComponent } from './proactive-leadership-dashboard.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ProactiveLeadershipDashboardComponent', () => {
  let component: ProactiveLeadershipDashboardComponent;
  let fixture: ComponentFixture<ProactiveLeadershipDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProactiveLeadershipDashboardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ProactiveLeadershipDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
