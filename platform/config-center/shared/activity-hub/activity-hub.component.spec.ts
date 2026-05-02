import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivityHubComponent } from './activity-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ActivityHubComponent', () => {
  let component: ActivityHubComponent;
  let fixture: ComponentFixture<ActivityHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ActivityHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
