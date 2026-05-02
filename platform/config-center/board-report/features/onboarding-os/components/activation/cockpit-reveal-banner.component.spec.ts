import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CockpitRevealBannerComponent } from './cockpit-reveal-banner.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CockpitRevealBannerComponent', () => {
  let component: CockpitRevealBannerComponent;
  let fixture: ComponentFixture<CockpitRevealBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CockpitRevealBannerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CockpitRevealBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
