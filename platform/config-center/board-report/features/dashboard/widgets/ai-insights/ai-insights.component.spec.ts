import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiInsightsComponent } from './ai-insights.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiInsightsComponent', () => {
  let component: AiInsightsComponent;
  let fixture: ComponentFixture<AiInsightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiInsightsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiInsightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
