import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RemediationWidgetComponent } from './remediation-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RemediationWidgetComponent', () => {
  let component: RemediationWidgetComponent;
  let fixture: ComponentFixture<RemediationWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemediationWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RemediationWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
