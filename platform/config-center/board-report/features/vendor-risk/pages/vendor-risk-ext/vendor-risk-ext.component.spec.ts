import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorRiskExtComponent } from './vendor-risk-ext.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorRiskExtComponent', () => {
  let component: VendorRiskExtComponent;
  let fixture: ComponentFixture<VendorRiskExtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorRiskExtComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorRiskExtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
