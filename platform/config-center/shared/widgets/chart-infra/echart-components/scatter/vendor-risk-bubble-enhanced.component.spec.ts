import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorRiskBubbleEnhancedComponent } from './vendor-risk-bubble-enhanced.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorRiskBubbleEnhancedComponent', () => {
  let component: VendorRiskBubbleEnhancedComponent;
  let fixture: ComponentFixture<VendorRiskBubbleEnhancedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorRiskBubbleEnhancedComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorRiskBubbleEnhancedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
