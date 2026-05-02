import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiPersonalAgentComponent } from './ai-personal-agent.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiPersonalAgentComponent', () => {
  let component: AiPersonalAgentComponent;
  let fixture: ComponentFixture<AiPersonalAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPersonalAgentComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiPersonalAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
