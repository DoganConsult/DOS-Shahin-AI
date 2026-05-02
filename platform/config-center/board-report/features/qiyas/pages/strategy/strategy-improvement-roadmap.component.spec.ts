import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StrategyImprovementRoadmapComponent } from './strategy-improvement-roadmap.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('StrategyImprovementRoadmapComponent', () => {
  let component: StrategyImprovementRoadmapComponent;
  let fixture: ComponentFixture<StrategyImprovementRoadmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyImprovementRoadmapComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(StrategyImprovementRoadmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
