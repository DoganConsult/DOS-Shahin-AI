import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MaturityScoreWidgetComponent } from './maturity-score-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MaturityScoreWidgetComponent', () => {
  let component: MaturityScoreWidgetComponent;
  let fixture: ComponentFixture<MaturityScoreWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaturityScoreWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MaturityScoreWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
