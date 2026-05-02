import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivityStreamComponent } from './activity-stream.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ActivityStreamComponent', () => {
  let component: ActivityStreamComponent;
  let fixture: ComponentFixture<ActivityStreamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityStreamComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ActivityStreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
