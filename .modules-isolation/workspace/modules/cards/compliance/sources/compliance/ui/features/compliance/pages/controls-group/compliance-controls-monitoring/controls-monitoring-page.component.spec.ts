import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsMonitoringPageComponent } from './controls-monitoring-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlsMonitoringPageComponent', () => {
  let component: ControlsMonitoringPageComponent;
  let fixture: ComponentFixture<ControlsMonitoringPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsMonitoringPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlsMonitoringPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
