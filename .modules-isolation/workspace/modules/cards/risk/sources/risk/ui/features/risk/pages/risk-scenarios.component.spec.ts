import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskScenariosComponent } from './risk-scenarios.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskScenariosComponent', () => {
  let component: RiskScenariosComponent;
  let fixture: ComponentFixture<RiskScenariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskScenariosComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
