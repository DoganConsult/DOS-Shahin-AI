import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NinetyDayPlanComponent } from './ninety-day-plan.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NinetyDayPlanComponent', () => {
  let component: NinetyDayPlanComponent;
  let fixture: ComponentFixture<NinetyDayPlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NinetyDayPlanComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NinetyDayPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
