import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ScoreRingComponent } from './score-ring.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ScoreRingComponent', () => {
  let component: ScoreRingComponent;
  let fixture: ComponentFixture<ScoreRingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreRingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ScoreRingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
