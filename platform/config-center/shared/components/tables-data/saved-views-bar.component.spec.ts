import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SavedViewsBarComponent } from './saved-views-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SavedViewsBarComponent', () => {
  let component: SavedViewsBarComponent;
  let fixture: ComponentFixture<SavedViewsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedViewsBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SavedViewsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
