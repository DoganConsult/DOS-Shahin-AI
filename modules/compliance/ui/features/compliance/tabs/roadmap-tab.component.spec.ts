import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoadmapTabComponent } from './roadmap-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RoadmapTabComponent', () => {
  let component: RoadmapTabComponent;
  let fixture: ComponentFixture<RoadmapTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoadmapTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RoadmapTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
