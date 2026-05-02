import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorAssessmentsTabComponent } from './vendor-assessments-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorAssessmentsTabComponent', () => {
  let component: VendorAssessmentsTabComponent;
  let fixture: ComponentFixture<VendorAssessmentsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorAssessmentsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorAssessmentsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
