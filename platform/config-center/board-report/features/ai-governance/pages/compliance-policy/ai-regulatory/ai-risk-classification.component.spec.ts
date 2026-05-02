import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiRiskClassificationComponent } from './ai-risk-classification.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiRiskClassificationComponent', () => {
  let component: AiRiskClassificationComponent;
  let fixture: ComponentFixture<AiRiskClassificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiRiskClassificationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiRiskClassificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
