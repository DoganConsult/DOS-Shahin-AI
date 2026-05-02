import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorWidgetComponent } from './vendor-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorWidgetComponent', () => {
  let component: VendorWidgetComponent;
  let fixture: ComponentFixture<VendorWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
