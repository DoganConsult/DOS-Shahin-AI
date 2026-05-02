import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RegistrationHeroComponent } from './registration-hero.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RegistrationHeroComponent', () => {
  let component: RegistrationHeroComponent;
  let fixture: ComponentFixture<RegistrationHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrationHeroComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RegistrationHeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
