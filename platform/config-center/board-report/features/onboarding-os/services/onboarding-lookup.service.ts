/**
 * Onboarding Lookup Service
 * Provides access to all lookup data with caching and search
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { devError } from '../utils/dev-logger';

/** Generic API envelope returned by the lookup endpoints */
interface ApiResponse<T> {
  data: T;
}

// Interfaces
export interface Country {
  id: string;
  country_code: string;
  country_code_3: string;
  name_en: string;
  name_ar: string;
  dial_code: string;
  flag_emoji: string;
  continent: string;
  currency_code: string;
}

export interface City {
  id: string;
  city_code: string;
  city_name_en: string;
  city_name_ar: string;
  country_code: string;
  state_province: string;
  region: string;
  timezone: string;
  is_capital: boolean;
  is_major_city: boolean;
}

export interface Sector {
  id: string;
  sector_code: string;
  parent_sector_code: string | null;
  sector_name_en: string;
  sector_name_ar: string;
  description_en: string;
  description_ar: string;
  icon_class: string;
  level: number;
  regulatory_requirements: Record<string, unknown>[];
  typical_frameworks: Record<string, unknown>[];
}

export interface EmployeeRange {
  id: string;
  range_code: string;
  range_label_en: string;
  range_label_ar: string;
  min_employees: number;
  max_employees: number | null;
  enterprise_type: string;
}

export interface Timezone {
  id: string;
  timezone_code: string;
  timezone_name: string;
  utc_offset: string;
  utc_offset_minutes: number;
  countries: string[];
}

export interface Language {
  id: string;
  language_code: string;
  language_name_en: string;
  language_name_native: string;
  rtl: boolean;
  is_primary: boolean;
}

export interface Framework {
  id: string;
  framework_code: string;
  framework_name: string;
  framework_acronym: string;
  description_en: string;
  description_ar: string;
  regulatory_body: string;
  jurisdiction: string;
  compliance_level: string;
}

export interface AllLookups {
  countries: Country[];
  employeeRanges: EmployeeRange[];
  languages: Language[];
  timezones: Timezone[];
  topSectors: Sector[];
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingLookupService {
  private apiUrl = `${environment.apiUrl}/onboarding/lookups`;
  private cache = new Map<string, Observable<any>>();

  // Store initial lookups for quick access
  private lookupsSubject = new BehaviorSubject<AllLookups | null>(null);
  public lookups$ = this.lookupsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load all initial lookups
   */
  private loadInitialLookups(): void {
    this.getAllLookups().subscribe(
      lookups => this.lookupsSubject.next(lookups),
      error => devError('Error loading initial lookups:', error)
    );
  }

  /**
   * Get all lookups for initial load
   */
  getAllLookups(): Observable<AllLookups> {
    const cacheKey = 'all-lookups';

    if (!this.cache.has(cacheKey)) {
      const request$ = this.http.get<ApiResponse<AllLookups>>(`${this.apiUrl}/all`).pipe(
        map(response => response.data),
        shareReplay(1),
        catchError(error => {
          devError('Error fetching all lookups:', error);
          this.cache.delete(cacheKey);
          return of({
            countries: [],
            employeeRanges: [],
            languages: [],
            timezones: [],
            topSectors: []
          });
        })
      );

      this.cache.set(cacheKey, request$);
    }

    return this.cache.get(cacheKey)! as Observable<AllLookups>;
  }

  /**
   * Get countries with optional search
   */
  getCountries(search?: string): Observable<Country[]> {
    const params = new HttpParams().set('search', search || '');

    return this.http.get<ApiResponse<Country[]>>(`${this.apiUrl}/countries`, { params }).pipe(
      map(response => response.data),
      catchError(error => {
        devError('Error fetching countries:', error);
        return of([]);
      })
    );
  }

  /**
   * Get cities with filters
   */
  getCities(countryCode?: string, search?: string, limit = 20): Observable<City[]> {
    let params = new HttpParams().set('limit', limit.toString());

    if (countryCode) {
      params = params.set('country', countryCode);
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiResponse<City[]>>(`${this.apiUrl}/cities`, { params }).pipe(
      map(response => response.data),
      catchError(error => {
        devError('Error fetching cities:', error);
        return of([]);
      })
    );
  }

  /**
   * Get sectors with search and parent filter
   */
  getSectors(search?: string, parentCode?: string, limit = 50): Observable<Sector[]> {
    let params = new HttpParams().set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    if (parentCode) {
      params = params.set('parent', parentCode);
    }

    return this.http.get<ApiResponse<Sector[]>>(`${this.apiUrl}/sectors`, { params }).pipe(
      map(response => response.data),
      catchError(error => {
        devError('Error fetching sectors:', error);
        return of([]);
      })
    );
  }

  /**
   * Get employee ranges
   */
  getEmployeeRanges(): Observable<EmployeeRange[]> {
    const cacheKey = 'employee-ranges';

    if (!this.cache.has(cacheKey)) {
      const request$ = this.http.get<ApiResponse<EmployeeRange[]>>(`${this.apiUrl}/employee-ranges`).pipe(
        map(response => response.data),
        shareReplay(1),
        catchError(error => {
          devError('Error fetching employee ranges:', error);
          return of([]);
        })
      );

      this.cache.set(cacheKey, request$);
    }

    return this.cache.get(cacheKey)! as Observable<EmployeeRange[]>;
  }

  /**
   * Get timezones with optional country filter
   */
  getTimezones(countryCode?: string): Observable<Timezone[]> {
    const cacheKey = `timezones-${countryCode || 'all'}`;

    if (!this.cache.has(cacheKey)) {
      let params = new HttpParams();

      if (countryCode) {
        params = params.set('country', countryCode);
      }

      const request$ = this.http.get<ApiResponse<Timezone[]>>(`${this.apiUrl}/timezones`, { params }).pipe(
        map(response => response.data),
        shareReplay(1),
        catchError(error => {
          devError('Error fetching timezones:', error);
          return of([]);
        })
      );

      this.cache.set(cacheKey, request$);
    }

    return this.cache.get(cacheKey)! as Observable<Timezone[]>;
  }

  /**
   * Get languages
   */
  getLanguages(onlyPrimary = false): Observable<Language[]> {
    const cacheKey = `languages-${onlyPrimary ? 'primary' : 'all'}`;

    if (!this.cache.has(cacheKey)) {
      const params = new HttpParams().set('primary', onlyPrimary.toString());

      const request$ = this.http.get<ApiResponse<Language[]>>(`${this.apiUrl}/languages`, { params }).pipe(
        map(response => response.data),
        shareReplay(1),
        catchError(error => {
          devError('Error fetching languages:', error);
          return of([]);
        })
      );

      this.cache.set(cacheKey, request$);
    }

    return this.cache.get(cacheKey)! as Observable<Language[]>;
  }

  /**
   * Get frameworks with optional sector filter
   */
  getFrameworks(sectorCode?: string): Observable<Framework[]> {
    const cacheKey = `frameworks-${sectorCode || 'all'}`;

    if (!this.cache.has(cacheKey)) {
      let params = new HttpParams();

      if (sectorCode) {
        params = params.set('sector', sectorCode);
      }

      const request$ = this.http.get<ApiResponse<Framework[]>>(`${this.apiUrl}/frameworks`, { params }).pipe(
        map(response => response.data),
        shareReplay(1),
        catchError(error => {
          devError('Error fetching frameworks:', error);
          return of([]);
        })
      );

      this.cache.set(cacheKey, request$);
    }

    return this.cache.get(cacheKey)! as Observable<Framework[]>;
  }

  /**
   * Get dynamic lookups by category
   */
  getDynamicLookups(category: string): Observable<any[]> {
    return this.http.get<ApiResponse<unknown[]>>(`${this.apiUrl}/dynamic/${category}`).pipe(
      map(response => response.data),
      catchError(error => {
        devError(`Error fetching ${category} lookups:`, error);
        return of([]);
      })
    );
  }

  /**
   * UNIVERSAL LOOKUP RESOLVER — serves ANY lookup table by name.
   * The shell calls this for every question where lookup_table is set.
   * Returns normalized { value, label_en, label_ar, ...extra } rows.
   */
  resolveLookup(
    tableName: string,
    parentValue?: string,
    dependsOnColumn?: string,
    search?: string,
    limit = 200
  ): Observable<Array<{ value: string; label_en: string; label_ar: string; [k: string]: unknown }>> {
    const cacheKey = `resolve:${tableName}:${parentValue || ''}:${dependsOnColumn || ''}:${search || ''}`;

    if (!this.cache.has(cacheKey)) {
      let params = new HttpParams().set('limit', limit.toString());
      if (parentValue) params = params.set('parentValue', parentValue);
      if (dependsOnColumn) params = params.set('dependsOn', dependsOnColumn);
      if (search) params = params.set('search', search);

      type LookupRow = { value: string; label_en: string; label_ar: string; [k: string]: unknown };
      const request$ = this.http
        .get<ApiResponse<LookupRow[]>>(`${this.apiUrl}/resolve/${tableName}`, { params })
        .pipe(
          map(response => response.data || []),
          shareReplay(1),
          catchError(error => {
            devError(`Error resolving lookup ${tableName}:`, error);
            this.cache.delete(cacheKey);
            return of([]);
          })
        );

      this.cache.set(cacheKey, request$);
    }

    return this.cache.get(cacheKey)! as Observable<Array<{ value: string; label_en: string; label_ar: string; [k: string]: unknown }>>;
  }

  /**
   * Get tenant roles from the roles table
   */
  getRoles(): Observable<Array<{ value: string; label_en: string; label_ar: string; [k: string]: unknown }>> {
    const cacheKey = 'tenant-roles';
    if (!this.cache.has(cacheKey)) {
      type RoleRow = { value: string; label_en: string; label_ar: string; [k: string]: unknown };
      const request$ = this.http.get<ApiResponse<RoleRow[]>>(`${this.apiUrl}/roles`).pipe(
        map(response => response.data || []),
        shareReplay(1),
        catchError(error => {
          devError('Error fetching roles:', error);
          this.cache.delete(cacheKey);
          return of([]);
        })
      );
      this.cache.set(cacheKey, request$);
    }
    return this.cache.get(cacheKey)! as Observable<Array<{ value: string; label_en: string; label_ar: string; [k: string]: unknown }>>;
  }

  /**
   * Invalidate cached entries for a specific table (e.g. when parent value changes)
   */
  invalidateLookup(tableName: string): void {
    const keysToRemove: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(`resolve:${tableName}:`)) keysToRemove.push(key);
    });
    keysToRemove.forEach(k => this.cache.delete(k));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lookupsSubject.next(null);
  }

  /**
   * Format options for PrimeNG dropdown
   */
  formatForDropdown(items: Record<string, unknown>[], labelField: string, valueField: string = 'id'): Record<string, unknown>[] {
    return items.map(item => ({
      label: item[labelField],
      value: item[valueField],
      data: item
    }));
  }

  /**
   * Format countries for dropdown with flags
   */
  formatCountriesForDropdown(countries: Country[], language: 'en' | 'ar' = 'en'): Record<string, unknown>[] {
    return countries.map(country => ({
      label: `${country.flag_emoji} ${language === 'en' ? country.name_en : country.name_ar}`,
      value: country.country_code,
      data: country
    }));
  }

  /**
   * Format sectors for tree/dropdown
   */
  formatSectorsForDropdown(sectors: Sector[], language: 'en' | 'ar' = 'en'): Record<string, unknown>[] {
    return sectors.map(sector => ({
      label: language === 'en' ? sector.sector_name_en : sector.sector_name_ar,
      value: sector.sector_code,
      icon: sector.icon_class,
      data: sector,
      selectable: sector.level > 1 || !sector.parent_sector_code // Allow selection of sub-sectors or top-level
    }));
  }

  /**
   * Build sector tree for hierarchical display
   */
  buildSectorTree(sectors: Sector[], language: 'en' | 'ar' = 'en'): Record<string, unknown>[] {
    const tree: Record<string, unknown>[] = [];
    const map = new Map<string, any>();

    // First pass: create all nodes
    sectors.forEach(sector => {
      const node = {
        label: language === 'en' ? sector.sector_name_en : sector.sector_name_ar,
        value: sector.sector_code,
        icon: sector.icon_class,
        data: sector,
        children: [],
        selectable: sector.level > 1 || !sector.parent_sector_code
      };
      map.set(sector.sector_code, node);
    });

    // Second pass: build tree structure
    sectors.forEach(sector => {
      const node = map.get(sector.sector_code);
      if (sector.parent_sector_code) {
        const parent = map.get(sector.parent_sector_code);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        tree.push(node);
      }
    });

    return tree;
  }
}