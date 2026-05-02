import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MobileOnboardingComponent } from './mobile-onboarding.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MobileOnboardingComponent', () => {
  let component: MobileOnboardingComponent;
  let fixture: ComponentFixture<MobileOnboardingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileOnboardingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MobileOnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
