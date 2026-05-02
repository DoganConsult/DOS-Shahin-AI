import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MaturityJourneyComponent } from './maturity-journey.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MaturityJourneyComponent', () => {
  let component: MaturityJourneyComponent;
  let fixture: ComponentFixture<MaturityJourneyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaturityJourneyComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MaturityJourneyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
