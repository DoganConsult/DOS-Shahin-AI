import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { JourneyWidgetComponent } from './journey-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('JourneyWidgetComponent', () => {
  let component: JourneyWidgetComponent;
  let fixture: ComponentFixture<JourneyWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JourneyWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(JourneyWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
