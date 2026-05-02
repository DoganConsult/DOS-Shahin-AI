import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PrivacyConsentComponent } from './privacy-consent.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PrivacyConsentComponent', () => {
  let component: PrivacyConsentComponent;
  let fixture: ComponentFixture<PrivacyConsentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyConsentComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PrivacyConsentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
