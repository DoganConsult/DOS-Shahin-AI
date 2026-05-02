import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationDiagnosticsComponent } from './notification-diagnostics.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NotificationDiagnosticsComponent', () => {
  let component: NotificationDiagnosticsComponent;
  let fixture: ComponentFixture<NotificationDiagnosticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationDiagnosticsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NotificationDiagnosticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
