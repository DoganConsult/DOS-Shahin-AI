import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskWidgetComponent } from './risk-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskWidgetComponent', () => {
  let component: RiskWidgetComponent;
  let fixture: ComponentFixture<RiskWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
