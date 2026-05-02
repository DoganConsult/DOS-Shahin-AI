import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorDocumentsTabComponent } from './vendor-documents-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorDocumentsTabComponent', () => {
  let component: VendorDocumentsTabComponent;
  let fixture: ComponentFixture<VendorDocumentsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorDocumentsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorDocumentsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
