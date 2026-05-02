import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskOverviewComponent } from './risk-overview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskOverviewComponent', () => {
  let component: RiskOverviewComponent;
  let fixture: ComponentFixture<RiskOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskOverviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
