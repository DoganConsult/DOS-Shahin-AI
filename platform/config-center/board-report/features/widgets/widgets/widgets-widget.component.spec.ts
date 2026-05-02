import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WidgetsWidgetComponent } from './widgets-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WidgetsWidgetComponent', () => {
  let component: WidgetsWidgetComponent;
  let fixture: ComponentFixture<WidgetsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetsWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WidgetsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
