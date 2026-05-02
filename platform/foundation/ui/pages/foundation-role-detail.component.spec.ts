import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationRoleDetailComponent } from './foundation-role-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationRoleDetailComponent', () => {
  let component: FoundationRoleDetailComponent;
  let fixture: ComponentFixture<FoundationRoleDetailComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationRoleDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'admin' } },
            params: of({ id: 'admin' }),
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoundationRoleDetailComponent);
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

  it('renders role data from the API', () => {
    const req = httpMock.expectOne((r) => r.url.includes('/roles/admin/detail'));
    req.flush({ data: { code: 'admin', name_en: 'Administrator', is_system: true } });
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.role()?.name_en).toBe('Administrator');
    expect(component.role()?.is_system).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('surfaces API errors without crashing', () => {
    const req = httpMock.expectOne((r) => r.url.includes('/roles/admin/detail'));
    req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.role()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('subscription is disposed on component destroy (takeUntilDestroyed proof)', () => {
    // The request is still in flight when we destroy the component.
    const req = httpMock.expectOne((r) => r.url.includes('/roles/admin/detail'));

    // Destroy before the response arrives.
    fixture.destroy();

    // Flush AFTER destroy — if takeUntilDestroyed is wired, the signal must
    // NOT be updated (it stays in its default "loading" or "null role" state
    // without throwing on destroyed component).
    expect(() => req.flush({ data: { code: 'admin' } })).not.toThrow();

    // loading was true when destroyed; the post-destroy flush must not change it.
    expect(component.loading()).toBe(true);
    expect(component.role()).toBeNull();
  });
});
