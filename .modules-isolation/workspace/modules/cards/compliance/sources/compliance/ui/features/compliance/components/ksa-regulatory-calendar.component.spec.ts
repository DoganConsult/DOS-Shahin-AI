import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KsaRegulatoryCalendarComponent } from './ksa-regulatory-calendar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('KsaRegulatoryCalendarComponent', () => {
  let component: KsaRegulatoryCalendarComponent;
  let fixture: ComponentFixture<KsaRegulatoryCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KsaRegulatoryCalendarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(KsaRegulatoryCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
