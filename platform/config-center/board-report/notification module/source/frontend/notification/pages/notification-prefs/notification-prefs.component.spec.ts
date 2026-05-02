import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationPrefsComponent } from './notification-prefs.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NotificationPrefsComponent', () => {
  let component: NotificationPrefsComponent;
  let fixture: ComponentFixture<NotificationPrefsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationPrefsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NotificationPrefsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
