import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskIssuesComponent } from './risk-issues.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskIssuesComponent', () => {
  let component: RiskIssuesComponent;
  let fixture: ComponentFixture<RiskIssuesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskIssuesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskIssuesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
