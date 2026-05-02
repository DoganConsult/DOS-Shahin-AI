import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleOnboardingShellComponent } from './module-onboarding-shell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ModuleOnboardingShellComponent', () => {
  let component: ModuleOnboardingShellComponent;
  let fixture: ComponentFixture<ModuleOnboardingShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleOnboardingShellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ModuleOnboardingShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
