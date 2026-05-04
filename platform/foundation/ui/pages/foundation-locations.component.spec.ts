import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { FoundationLocationsComponent } from './foundation-locations.component';
import { AccessStore } from '@dos/access-store';

class StubAccessStore {
  permissions = { length: 0 };
  isAdmin = (): boolean => true;
  hasPermission = (_p: string | null | undefined): boolean => true;
  canAccessModule = (_m: string | null | undefined): boolean => true;
  load = async (_force?: boolean): Promise<boolean> => true;
}

describe('FoundationLocationsComponent', () => {
  let component: FoundationLocationsComponent;
  let fixture: ComponentFixture<FoundationLocationsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationLocationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AccessStore, useClass: StubAccessStore },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } }, params: of({ id: '1' }), queryParams: of({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoundationLocationsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Drain all in-flight requests so verify() does not flag the i18n preload (etc.).
    httpMock.match(() => true).forEach((req) => req.flush({}));
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('issues GET /locations on init with default pagination', () => {
    const reqs = httpMock.match((r) => r.url.endsWith('/locations'));
    expect(reqs.length).toBeGreaterThanOrEqual(1);
    const req = reqs[0];
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush({ success: true, data: [], total: 0, page: 1, pageSize: 25 });
  });

  it('renders rows from typed { data, total } response', () => {
    const reqs = httpMock.match((r) => r.url.endsWith('/locations'));
    reqs[0].flush({
      success: true,
      data: [
        { location_id: 'L1', name_en: 'Riyadh HQ', code: 'RYD', location_type: 'office', country: 'SA', city: 'Riyadh', status: 'active' },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    fixture.detectChanges();
    expect(component.items().length).toBe(1);
    expect(component.items()[0].location_id).toBe('L1');
    expect(component.total()).toBe(1);
  });

  it('exposes a real API failure (does not silently fall back)', () => {
    const reqs = httpMock.match((r) => r.url.endsWith('/locations'));
    reqs[0].flush({ message: 'Boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.items().length).toBe(0);
  });
});
