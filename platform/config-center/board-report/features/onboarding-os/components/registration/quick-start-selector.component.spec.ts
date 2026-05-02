import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QuickStartSelectorComponent } from './quick-start-selector.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QuickStartSelectorComponent', () => {
  let component: QuickStartSelectorComponent;
  let fixture: ComponentFixture<QuickStartSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickStartSelectorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QuickStartSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
