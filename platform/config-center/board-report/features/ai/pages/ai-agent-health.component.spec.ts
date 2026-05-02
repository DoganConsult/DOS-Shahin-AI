import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAgentHealthComponent } from './ai-agent-health.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAgentHealthComponent', () => {
  let component: AiAgentHealthComponent;
  let fixture: ComponentFixture<AiAgentHealthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAgentHealthComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAgentHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
