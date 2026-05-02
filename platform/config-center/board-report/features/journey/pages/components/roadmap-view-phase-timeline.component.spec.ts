import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoadmapViewPhaseTimelineComponent } from './roadmap-view-phase-timeline.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RoadmapViewPhaseTimelineComponent', () => {
  let component: RoadmapViewPhaseTimelineComponent;
  let fixture: ComponentFixture<RoadmapViewPhaseTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoadmapViewPhaseTimelineComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RoadmapViewPhaseTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
