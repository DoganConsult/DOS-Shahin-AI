import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiKillswitchPanelComponent } from './ai-killswitch-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiKillswitchPanelComponent', () => {
  let component: AiKillswitchPanelComponent;
  let fixture: ComponentFixture<AiKillswitchPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiKillswitchPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiKillswitchPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
