import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActionBoardComponent } from './action-board.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ActionBoardComponent', () => {
  let component: ActionBoardComponent;
  let fixture: ComponentFixture<ActionBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionBoardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ActionBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
