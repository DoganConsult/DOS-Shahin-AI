import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorFindingsTabComponent } from './vendor-findings-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorFindingsTabComponent', () => {
  let component: VendorFindingsTabComponent;
  let fixture: ComponentFixture<VendorFindingsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorFindingsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorFindingsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
