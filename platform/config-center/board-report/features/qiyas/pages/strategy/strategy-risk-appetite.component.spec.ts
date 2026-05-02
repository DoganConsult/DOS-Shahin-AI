import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StrategyRiskAppetiteComponent } from './strategy-risk-appetite.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('StrategyRiskAppetiteComponent', () => {
  let component: StrategyRiskAppetiteComponent;
  let fixture: ComponentFixture<StrategyRiskAppetiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyRiskAppetiteComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(StrategyRiskAppetiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
