import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskDistributionComponent } from './risk-distribution.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskDistributionComponent', () => {
  let component: RiskDistributionComponent;
  let fixture: ComponentFixture<RiskDistributionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskDistributionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskDistributionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
