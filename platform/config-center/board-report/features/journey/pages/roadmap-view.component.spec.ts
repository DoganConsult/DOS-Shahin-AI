import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoadmapViewComponent } from './roadmap-view.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RoadmapViewComponent', () => {
  let component: RoadmapViewComponent;
  let fixture: ComponentFixture<RoadmapViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoadmapViewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RoadmapViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
