import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcCanvasBoardComponent } from './grc-canvas-board.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GrcCanvasBoardComponent', () => {
  let component: GrcCanvasBoardComponent;
  let fixture: ComponentFixture<GrcCanvasBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrcCanvasBoardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GrcCanvasBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
