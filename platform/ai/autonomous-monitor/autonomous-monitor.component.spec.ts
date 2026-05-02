import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AutonomousMonitorComponent } from './autonomous-monitor.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AutonomousMonitorComponent', () => {
  let component: AutonomousMonitorComponent;
  let fixture: ComponentFixture<AutonomousMonitorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutonomousMonitorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AutonomousMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
