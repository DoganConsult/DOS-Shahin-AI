import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BoardDecisionsComponent } from './board-decisions.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BoardDecisionsComponent', () => {
  let component: BoardDecisionsComponent;
  let fixture: ComponentFixture<BoardDecisionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardDecisionsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BoardDecisionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
