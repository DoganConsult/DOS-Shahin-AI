import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasRoadmapComponent } from './qiyas-roadmap.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasRoadmapComponent', () => {
  let component: QiyasRoadmapComponent;
  let fixture: ComponentFixture<QiyasRoadmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasRoadmapComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasRoadmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
