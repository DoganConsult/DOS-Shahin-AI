import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PrivacyIncidentsWidgetComponent } from './privacy-incidents-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PrivacyIncidentsWidgetComponent', () => {
  let component: PrivacyIncidentsWidgetComponent;
  let fixture: ComponentFixture<PrivacyIncidentsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyIncidentsWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PrivacyIncidentsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
