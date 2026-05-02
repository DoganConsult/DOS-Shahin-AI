import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NudgeNotificationsComponent } from './nudge-notifications.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NudgeNotificationsComponent', () => {
  let component: NudgeNotificationsComponent;
  let fixture: ComponentFixture<NudgeNotificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NudgeNotificationsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NudgeNotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
