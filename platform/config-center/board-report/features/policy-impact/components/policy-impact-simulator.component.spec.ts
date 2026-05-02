import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyImpactSimulatorComponent } from './policy-impact-simulator.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyImpactSimulatorComponent', () => {
  let component: PolicyImpactSimulatorComponent;
  let fixture: ComponentFixture<PolicyImpactSimulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyImpactSimulatorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyImpactSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
