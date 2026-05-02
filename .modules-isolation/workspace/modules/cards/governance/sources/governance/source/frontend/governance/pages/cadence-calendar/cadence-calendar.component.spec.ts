import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CadenceCalendarComponent } from './cadence-calendar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CadenceCalendarComponent', () => {
  let component: CadenceCalendarComponent;
  let fixture: ComponentFixture<CadenceCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadenceCalendarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CadenceCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
