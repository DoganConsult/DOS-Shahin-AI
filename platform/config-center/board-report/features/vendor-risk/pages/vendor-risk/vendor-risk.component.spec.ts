import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorRiskComponent } from './vendor-risk.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorRiskComponent', () => {
  let component: VendorRiskComponent;
  let fixture: ComponentFixture<VendorRiskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorRiskComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorRiskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
