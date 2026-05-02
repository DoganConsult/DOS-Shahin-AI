import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InlineTableCellComponent } from './inline-table-cell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InlineTableCellComponent', () => {
  let component: InlineTableCellComponent;
  let fixture: ComponentFixture<InlineTableCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InlineTableCellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InlineTableCellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
