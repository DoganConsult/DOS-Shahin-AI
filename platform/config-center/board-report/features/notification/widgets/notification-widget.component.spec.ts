import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationWidgetComponent } from './notification-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NotificationWidgetComponent', () => {
  let component: NotificationWidgetComponent;
  let fixture: ComponentFixture<NotificationWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NotificationWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
