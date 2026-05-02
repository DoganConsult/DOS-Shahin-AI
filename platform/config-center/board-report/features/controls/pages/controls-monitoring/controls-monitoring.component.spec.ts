import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsMonitoringComponent } from './controls-monitoring.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlsMonitoringComponent', () => {
  let component: ControlsMonitoringComponent;
  let fixture: ComponentFixture<ControlsMonitoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsMonitoringComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlsMonitoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
