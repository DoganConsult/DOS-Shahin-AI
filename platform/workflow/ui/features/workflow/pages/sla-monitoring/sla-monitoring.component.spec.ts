import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SlaMonitoringComponent } from './sla-monitoring.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SlaMonitoringComponent', () => {
  let component: SlaMonitoringComponent;
  let fixture: ComponentFixture<SlaMonitoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlaMonitoringComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SlaMonitoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
