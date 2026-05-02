import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrustComplianceSectionComponent } from './trust-compliance-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TrustComplianceSectionComponent', () => {
  let component: TrustComplianceSectionComponent;
  let fixture: ComponentFixture<TrustComplianceSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustComplianceSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TrustComplianceSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
