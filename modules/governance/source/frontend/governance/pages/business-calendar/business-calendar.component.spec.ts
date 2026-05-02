import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BusinessCalendarComponent } from './business-calendar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BusinessCalendarComponent', () => {
  let component: BusinessCalendarComponent;
  let fixture: ComponentFixture<BusinessCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessCalendarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BusinessCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
