import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorRiskWidgetComponent } from './vendor-risk-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorRiskWidgetComponent', () => {
  let component: VendorRiskWidgetComponent;
  let fixture: ComponentFixture<VendorRiskWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorRiskWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorRiskWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
