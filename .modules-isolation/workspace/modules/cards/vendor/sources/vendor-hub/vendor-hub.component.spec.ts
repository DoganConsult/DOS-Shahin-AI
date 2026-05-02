import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorHubComponent } from './vendor-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorHubComponent', () => {
  let component: VendorHubComponent;
  let fixture: ComponentFixture<VendorHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
