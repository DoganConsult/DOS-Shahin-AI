import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiExplainabilityComponent } from './ai-explainability.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiExplainabilityComponent', () => {
  let component: AiExplainabilityComponent;
  let fixture: ComponentFixture<AiExplainabilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiExplainabilityComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiExplainabilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
