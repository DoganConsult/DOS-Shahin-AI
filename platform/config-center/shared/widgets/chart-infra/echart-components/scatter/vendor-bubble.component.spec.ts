import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorBubbleComponent } from './vendor-bubble.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorBubbleComponent', () => {
  let component: VendorBubbleComponent;
  let fixture: ComponentFixture<VendorBubbleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorBubbleComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorBubbleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
