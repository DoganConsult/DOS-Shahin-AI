import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AnimatedRankingComponent } from './animated-ranking.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AnimatedRankingComponent', () => {
  let component: AnimatedRankingComponent;
  let fixture: ComponentFixture<AnimatedRankingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimatedRankingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AnimatedRankingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
