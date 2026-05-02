import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationWidgetComponent } from './navigation-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NavigationWidgetComponent', () => {
  let component: NavigationWidgetComponent;
  let fixture: ComponentFixture<NavigationWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NavigationWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
