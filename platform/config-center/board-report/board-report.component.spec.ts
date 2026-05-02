import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BoardReportComponent } from './board-report.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BoardReportComponent', () => {
  let component: BoardReportComponent;
  let fixture: ComponentFixture<BoardReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardReportComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BoardReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
