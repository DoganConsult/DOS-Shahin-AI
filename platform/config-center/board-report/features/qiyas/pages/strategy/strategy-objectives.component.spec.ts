import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StrategyObjectivesComponent } from './strategy-objectives.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('StrategyObjectivesComponent', () => {
  let component: StrategyObjectivesComponent;
  let fixture: ComponentFixture<StrategyObjectivesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyObjectivesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(StrategyObjectivesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
