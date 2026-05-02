import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyCoverageComponent } from './policy-coverage.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyCoverageComponent', () => {
  let component: PolicyCoverageComponent;
  let fixture: ComponentFixture<PolicyCoverageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyCoverageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyCoverageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
