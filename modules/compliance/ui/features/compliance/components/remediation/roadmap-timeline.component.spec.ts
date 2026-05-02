import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoadmapTimelineComponent } from './roadmap-timeline.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RoadmapTimelineComponent', () => {
  let component: RoadmapTimelineComponent;
  let fixture: ComponentFixture<RoadmapTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoadmapTimelineComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RoadmapTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
