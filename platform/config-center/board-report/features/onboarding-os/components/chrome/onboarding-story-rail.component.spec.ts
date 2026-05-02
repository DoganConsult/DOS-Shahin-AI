import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnboardingStoryRailComponent } from './onboarding-story-rail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OnboardingStoryRailComponent', () => {
  let component: OnboardingStoryRailComponent;
  let fixture: ComponentFixture<OnboardingStoryRailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingStoryRailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(OnboardingStoryRailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
