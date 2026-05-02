import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationAdminComponent } from './notification-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NotificationAdminComponent', () => {
  let component: NotificationAdminComponent;
  let fixture: ComponentFixture<NotificationAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NotificationAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
