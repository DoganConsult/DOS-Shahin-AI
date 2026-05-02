import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationOperationsReadinessComponent } from './foundation-operations-readiness.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationOperationsReadinessComponent', () => {
  let component: FoundationOperationsReadinessComponent;
  let fixture: ComponentFixture<FoundationOperationsReadinessComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationOperationsReadinessComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } },
            params: of({ id: '1' }),
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoundationOperationsReadinessComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => req.flush({}));
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('maps health-config API response to readiness checks', () => {
    const req = httpMock.expectOne((r) => r.url.includes('/foundation/health-config'));
    req.flush({ data: { totalNodes: 5, activeUsers: 3, orphanedNodes: 0, roleCount: 4, sodConflicts: 0 } });
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.loading()).toBe(false);
    const checks = component.checks();
    expect(checks.length).toBeGreaterThan(0);
    const nodeCheck = checks.find((c) => c.key === 'totalNodes');
    expect(nodeCheck?.status).toBe('pass');
    const orphanCheck = checks.find((c) => c.key === 'orphanedNodes');
    expect(orphanCheck?.status).toBe('pass');
    const sodCheck = checks.find((c) => c.key === 'sodConflicts');
    expect(sodCheck?.status).toBe('pass');
  });

  it('surfaces API errors without crashing', () => {
    const req = httpMock.expectOne((r) => r.url.includes('/foundation/health-config'));
    req.flush({ message: 'Service unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.checks().length).toBe(0);
    expect(component.loading()).toBe(false);
  });

  it('subscription is disposed on component destroy (takeUntilDestroyed proof)', () => {
    // Request is still in-flight when the component is destroyed.
    const req = httpMock.expectOne((r) => r.url.includes('/foundation/health-config'));

    fixture.destroy();

    // Flush AFTER destroy — takeUntilDestroyed must have completed the subscription.
    expect(() => req.flush({ data: { totalNodes: 10 } })).not.toThrow();

    // Signals must remain in their pre-destroy state (loading=true, checks=[]).
    expect(component.loading()).toBe(true);
    expect(component.checks().length).toBe(0);
  });
});
