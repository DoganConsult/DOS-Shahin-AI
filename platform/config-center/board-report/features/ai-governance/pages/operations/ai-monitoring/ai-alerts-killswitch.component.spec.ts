import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAlertsKillswitchComponent } from './ai-alerts-killswitch.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAlertsKillswitchComponent', () => {
  let component: AiAlertsKillswitchComponent;
  let fixture: ComponentFixture<AiAlertsKillswitchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAlertsKillswitchComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAlertsKillswitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
