import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskScoringComponent } from './risk-scoring.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskScoringComponent', () => {
  let component: RiskScoringComponent;
  let fixture: ComponentFixture<RiskScoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskScoringComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskScoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
