import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorBubbleWidgetComponent } from './vendor-bubble-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorBubbleWidgetComponent', () => {
  let component: VendorBubbleWidgetComponent;
  let fixture: ComponentFixture<VendorBubbleWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorBubbleWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorBubbleWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
