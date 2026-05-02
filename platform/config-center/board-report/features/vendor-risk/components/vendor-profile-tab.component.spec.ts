import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorProfileTabComponent } from './vendor-profile-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorProfileTabComponent', () => {
  let component: VendorProfileTabComponent;
  let fixture: ComponentFixture<VendorProfileTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorProfileTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorProfileTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
