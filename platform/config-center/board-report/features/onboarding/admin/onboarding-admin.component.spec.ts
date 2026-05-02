import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnboardingAdminComponent } from './onboarding-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OnboardingAdminComponent', () => {
  let component: OnboardingAdminComponent;
  let fixture: ComponentFixture<OnboardingAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(OnboardingAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
