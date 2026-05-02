import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RemediationTrackerComponent } from './remediation-tracker.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RemediationTrackerComponent', () => {
  let component: RemediationTrackerComponent;
  let fixture: ComponentFixture<RemediationTrackerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemediationTrackerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RemediationTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
