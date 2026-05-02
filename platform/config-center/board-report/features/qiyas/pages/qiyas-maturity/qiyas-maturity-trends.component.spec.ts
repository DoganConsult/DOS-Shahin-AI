import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasMaturityTrendsComponent } from './qiyas-maturity-trends.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasMaturityTrendsComponent', () => {
  let component: QiyasMaturityTrendsComponent;
  let fixture: ComponentFixture<QiyasMaturityTrendsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasMaturityTrendsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasMaturityTrendsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
