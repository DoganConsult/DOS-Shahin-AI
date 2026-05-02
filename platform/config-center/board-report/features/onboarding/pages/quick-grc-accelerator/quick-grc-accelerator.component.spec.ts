import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QuickGrcAcceleratorComponent } from './quick-grc-accelerator.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QuickGrcAcceleratorComponent', () => {
  let component: QuickGrcAcceleratorComponent;
  let fixture: ComponentFixture<QuickGrcAcceleratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickGrcAcceleratorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QuickGrcAcceleratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
