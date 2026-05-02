import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QuickLinkChipComponent } from './quick-link-chip.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QuickLinkChipComponent', () => {
  let component: QuickLinkChipComponent;
  let fixture: ComponentFixture<QuickLinkChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickLinkChipComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QuickLinkChipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
