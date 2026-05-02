import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAgentSessionsComponent } from './ai-agent-sessions.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAgentSessionsComponent', () => {
  let component: AiAgentSessionsComponent;
  let fixture: ComponentFixture<AiAgentSessionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAgentSessionsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAgentSessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
