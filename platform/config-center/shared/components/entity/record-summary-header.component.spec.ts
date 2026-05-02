import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecordSummaryHeaderComponent } from './record-summary-header.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RecordSummaryHeaderComponent', () => {
  let component: RecordSummaryHeaderComponent;
  let fixture: ComponentFixture<RecordSummaryHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordSummaryHeaderComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RecordSummaryHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
