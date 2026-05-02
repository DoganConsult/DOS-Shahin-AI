import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnboardingWelcomeComponent } from './onboarding-welcome.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OnboardingWelcomeComponent', () => {
  let component: OnboardingWelcomeComponent;
  let fixture: ComponentFixture<OnboardingWelcomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingWelcomeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(OnboardingWelcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
