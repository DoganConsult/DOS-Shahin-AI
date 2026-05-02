import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AnomalyTimelineComponent } from './anomaly-timeline.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AnomalyTimelineComponent', () => {
  let component: AnomalyTimelineComponent;
  let fixture: ComponentFixture<AnomalyTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnomalyTimelineComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AnomalyTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
