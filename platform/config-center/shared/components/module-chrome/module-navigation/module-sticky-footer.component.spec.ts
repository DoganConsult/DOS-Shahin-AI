import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleStickyFooterComponent } from './module-sticky-footer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ModuleStickyFooterComponent', () => {
  let component: ModuleStickyFooterComponent;
  let fixture: ComponentFixture<ModuleStickyFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleStickyFooterComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ModuleStickyFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
