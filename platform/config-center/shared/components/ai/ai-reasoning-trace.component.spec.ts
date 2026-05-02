import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiReasoningTraceComponent } from './ai-reasoning-trace.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiReasoningTraceComponent', () => {
  let component: AiReasoningTraceComponent;
  let fixture: ComponentFixture<AiReasoningTraceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiReasoningTraceComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiReasoningTraceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
