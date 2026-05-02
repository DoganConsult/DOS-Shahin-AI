import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationTemplatesComponent } from './notification-templates.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NotificationTemplatesComponent', () => {
  let component: NotificationTemplatesComponent;
  let fixture: ComponentFixture<NotificationTemplatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationTemplatesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NotificationTemplatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
