import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiMonitoringPlansComponent } from './ai-monitoring-plans.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiMonitoringPlansComponent', () => {
  let component: AiMonitoringPlansComponent;
  let fixture: ComponentFixture<AiMonitoringPlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiMonitoringPlansComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiMonitoringPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
