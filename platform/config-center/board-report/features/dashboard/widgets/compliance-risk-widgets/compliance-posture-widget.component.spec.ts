import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CompliancePostureWidgetComponent } from './compliance-posture-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CompliancePostureWidgetComponent', () => {
  let component: CompliancePostureWidgetComponent;
  let fixture: ComponentFixture<CompliancePostureWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompliancePostureWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CompliancePostureWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
