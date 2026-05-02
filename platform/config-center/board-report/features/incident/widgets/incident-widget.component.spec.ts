import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IncidentWidgetComponent } from './incident-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IncidentWidgetComponent', () => {
  let component: IncidentWidgetComponent;
  let fixture: ComponentFixture<IncidentWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IncidentWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
