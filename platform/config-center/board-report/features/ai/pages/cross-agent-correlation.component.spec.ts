import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CrossAgentCorrelationComponent } from './cross-agent-correlation.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CrossAgentCorrelationComponent', () => {
  let component: CrossAgentCorrelationComponent;
  let fixture: ComponentFixture<CrossAgentCorrelationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrossAgentCorrelationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CrossAgentCorrelationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
