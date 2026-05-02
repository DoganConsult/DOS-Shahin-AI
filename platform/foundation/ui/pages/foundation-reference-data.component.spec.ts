import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import {
  FoundationReferenceDataComponent,
  normalizeReferenceItems,
} from './foundation-reference-data.component';

describe('FoundationReferenceDataComponent', () => {
  let component: FoundationReferenceDataComponent;
  let fixture: ComponentFixture<FoundationReferenceDataComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationReferenceDataComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } }, params: of({ id: '1' }), queryParams: of({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoundationReferenceDataComponent);
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

  it('renders the backend-delivered group catalog when present', () => {
    const req = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups'));
    req.flush({
      referenceDataGroups: [
        { key: 'k1', endpoint: '/foundation/lookups/k1', labelEn: 'Group One', labelAr: 'مجموعة أولى', supportsWrite: false },
      ],
    });
    fixture.detectChanges();

    expect(component.groupsError()).toBeNull();
    expect(component.groups().length).toBe(1);
    expect(component.groups()[0].key).toBe('k1');
  });

  it('shows an EMPTY state (not hardcoded fallback groups) when the backend omits referenceDataGroups', () => {
    const req = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups'));
    // Backend contract drift: no referenceDataGroups key at all.
    req.flush({});
    fixture.detectChanges();

    expect(component.groupsError()).toBeNull();
    expect(component.groups().length).toBe(0); // no hardcoded entity-statuses / location-types fallback

    // The critical assertion: the stale hardcoded fallbacks must not leak in.
    const keys = component.groups().map((g) => g.key);
    expect(keys).not.toContain('entity-statuses');
    expect(keys).not.toContain('location-types');
  });

  it('shows the EMPTY state when referenceDataGroups is an empty array', () => {
    const req = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups'));
    req.flush({ referenceDataGroups: [] });
    fixture.detectChanges();
    expect(component.groups().length).toBe(0);
    expect(component.groupsError()).toBeNull();
  });

  it('surfaces lookupsLoadError from the getLookups() contract (no silent fallback)', () => {
    const req = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups'));
    // FoundationApiService.getLookups() swallows HTTP errors into a sentinel
    // { lookupsLoadError }. Simulate that by flushing a 500 — the service's
    // catchError converts it into the sentinel response.
    req.flush({ message: 'upstream unavailable' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.groupsError()).toBeTruthy();
    expect(component.groups().length).toBe(0);
    // No hardcoded groups should be rendered when the backend call failed.
    const keys = component.groups().map((g) => g.key);
    expect(keys).not.toContain('entity-statuses');
    expect(keys).not.toContain('location-types');
  });

  it('retry reloads /foundation/lookups', () => {
    const first = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups'));
    first.flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.groupsError()).toBeTruthy();

    component.loadGroups();
    const retried = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups'));
    expect(retried.request.method).toBe('GET');
    retried.flush({ referenceDataGroups: [] });
    fixture.detectChanges();
    expect(component.groupsError()).toBeNull();
  });

  it('selectGroup: renders items from typed { data | items | rows | array } via the adapter', () => {
    // Seed a group so selectGroup has something to operate on.
    const lookupsReq = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups'));
    lookupsReq.flush({
      referenceDataGroups: [
        { key: 'k1', endpoint: '/foundation/lookups/k1', labelEn: 'One', labelAr: 'أول', supportsWrite: false },
      ],
    });
    fixture.detectChanges();

    component.selectGroup(component.groups()[0]);
    const itemsReq = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups/k1'));
    itemsReq.flush({ data: [{ code: 'A', name_en: 'Alpha' }] });
    fixture.detectChanges();

    expect(component.itemsError()).toBeNull();
    expect(component.items().length).toBe(1);
    expect(component.items()[0].code).toBe('A');
  });

  it('selectGroup: exposes API failure for items without any silent fallback', () => {
    const lookupsReq = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups'));
    lookupsReq.flush({
      referenceDataGroups: [
        { key: 'k1', endpoint: '/foundation/lookups/k1', labelEn: 'One', labelAr: 'أول', supportsWrite: false },
      ],
    });
    fixture.detectChanges();

    component.selectGroup(component.groups()[0]);
    const itemsReq = httpMock.expectOne((r) => r.url.endsWith('/foundation/lookups/k1'));
    itemsReq.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.itemsError()).toBeTruthy();
    expect(component.items().length).toBe(0);
  });
});

describe('reference-data adapter (pure)', () => {
  it('returns [] for null / undefined / non-object / string', () => {
    expect(normalizeReferenceItems(null)).toEqual([]);
    expect(normalizeReferenceItems(undefined)).toEqual([]);
    expect(normalizeReferenceItems('x')).toEqual([]);
    expect(normalizeReferenceItems(42)).toEqual([]);
  });

  it('returns the array unchanged when the response IS the array', () => {
    const arr = [{ code: 'A' }, { code: 'B' }];
    expect(normalizeReferenceItems(arr)).toEqual(arr);
  });

  it('extracts data / items / rows envelopes (in that order)', () => {
    expect(normalizeReferenceItems({ data: [{ code: 'A' }] })).toEqual([{ code: 'A' }]);
    expect(normalizeReferenceItems({ items: [{ code: 'B' }] })).toEqual([{ code: 'B' }]);
    expect(normalizeReferenceItems({ rows: [{ code: 'C' }] })).toEqual([{ code: 'C' }]);
    // data wins when multiple envelopes are present — documented priority.
    expect(normalizeReferenceItems({ data: [{ code: 'A' }], items: [{ code: 'X' }] })).toEqual([{ code: 'A' }]);
  });

  it('returns [] for unknown envelope shapes (no silent pass-through of arbitrary structure)', () => {
    expect(normalizeReferenceItems({ payload: [{ code: 'A' }] })).toEqual([]);
    expect(normalizeReferenceItems({ data: 'not-an-array' })).toEqual([]);
  });
});
