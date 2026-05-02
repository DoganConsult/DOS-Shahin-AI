import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NinetyDayTimelineComponent } from './ninety-day-timeline.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NinetyDayTimelineComponent', () => {
  let component: NinetyDayTimelineComponent;
  let fixture: ComponentFixture<NinetyDayTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NinetyDayTimelineComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NinetyDayTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
