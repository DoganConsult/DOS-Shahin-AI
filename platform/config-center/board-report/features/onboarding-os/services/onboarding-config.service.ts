import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { environment } from '@env/environment';
import { devError } from '../utils/dev-logger';

// =====================================================
// Types
// =====================================================

export interface StageDefinition {
  id: string;
  stageCode: string;
  sortOrder: number;
  iconClass: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  isRequired: boolean;
  isActive: boolean;
  minReadinessScore: number;
  validationRules?: Record<string, unknown>;
}


export interface ProvisioningStepDefinition {
  id: string;
  stepCode: string;
  stepName: string;
  stepNameAr?: string;
  sequenceNo: number;
  isRequired: boolean;
  isActive: boolean;
  canRetry: boolean;
  maxRetries: number;
  timeoutSeconds: number;
  product_key?: string;
}

export interface UIConfiguration {
  thresholds: {
    readinessReady: number;
    readinessWarning: number;
  };
  behavior: {
    autosaveDelayMs: number;
    pollingIntervalMs: number;
    sessionTimeoutMinutes: number;
  };
  ui: {
    multiselectFilterThreshold: number;
    progressBarHeight: string;
    progressBarBorderRadius: string;
  };
  limits: {
    maxFileUploadSizeMb: number;
  };
  features: {
    enableAutosave: boolean;
    enableStageValidation: boolean;
    enableLiveIntelligence: boolean;
    enableMultiLanguage: boolean;
    enableStageSkip: boolean;
  };
  provisioning: {
    maxDurationMinutes: number;
    retryEnabled: boolean;
    parallelSteps: boolean;
  };
}

export interface Translation {
  id: string;
  translationKey: string;
  textEn: string;
  textAr: string;
  context?: string;
  isActive: boolean;
}

// =====================================================
// Service
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class OnboardingConfigService {
  private apiUrl = `${environment.apiUrl}/onboarding/config`;

  // Cache observables
  private stageDefinitions$?: Observable<StageDefinition[]>;
  private provisioningSteps$?: Observable<ProvisioningStepDefinition[]>;
  private uiConfig$?: Observable<UIConfiguration>;
  private translations$: Map<string, Observable<Record<string, Translation>>> = new Map();

  // Current values as BehaviorSubjects
  private currentStages$ = new BehaviorSubject<StageDefinition[]>([]);
  private currentUIConfig$ = new BehaviorSubject<UIConfiguration | null>(null);
  private currentTranslations$ = new BehaviorSubject<Record<string, string>>({});

  constructor(private http: HttpClient) {}

  // =====================================================
  // Stage Definitions
  // =====================================================

  /**
   * Get all stage definitions (with caching)
   */
  getStageDefinitions(forceRefresh = false): Observable<StageDefinition[]> {
    if (!this.stageDefinitions$ || forceRefresh) {
      this.stageDefinitions$ = this.http.get<{ stages: StageDefinition[] }>(`${this.apiUrl}/stages`).pipe(
        map(response => response.stages),
        tap(stages => this.currentStages$.next(stages)),
        catchError(error => {
          devError('Error loading stage definitions:', error);
          return throwError(() => error);
        }),
        shareReplay(1)
      );
    }
    return this.stageDefinitions$;
  }

  /**
   * Get current stages value
   */
  getCurrentStages(): StageDefinition[] {
    return this.currentStages$.value;
  }

  /**
   * Get stages as observable
   */
  getStagesObservable(): Observable<StageDefinition[]> {
    return this.currentStages$.asObservable();
  }

  // =====================================================
  // Provisioning Steps
  // =====================================================

  /**
   * Get all provisioning step definitions (with caching)
   */
  getProvisioningSteps(forceRefresh = false): Observable<ProvisioningStepDefinition[]> {
    if (!this.provisioningSteps$ || forceRefresh) {
      this.provisioningSteps$ = this.http.get<{ steps: ProvisioningStepDefinition[] }>(`${this.apiUrl}/provisioning-steps`).pipe(
        map(response => response.steps),
        catchError(error => {
          devError('Error loading provisioning steps:', error);
          return throwError(() => error);
        }),
        shareReplay(1)
      );
    }
    return this.provisioningSteps$;
  }

  // =====================================================
  // UI Configuration
  // =====================================================

  /**
   * Get UI configuration (with caching)
   */
  getUIConfig(forceRefresh = false): Observable<UIConfiguration> {
    if (!this.uiConfig$ || forceRefresh) {
      this.uiConfig$ = this.http.get<{ config: UIConfiguration }>(`${this.apiUrl}/ui`).pipe(
        map(response => response.config),
        tap(config => this.currentUIConfig$.next(config)),
        catchError(error => {
          devError('Error loading UI configuration:', error);
          return throwError(() => error);
        }),
        shareReplay(1)
      );
    }
    return this.uiConfig$;
  }

  /**
   * Get current UI config value
   */
  getCurrentUIConfig(): UIConfiguration | null {
    return this.currentUIConfig$.value;
  }

  /**
   * Get specific config value
   */
  async getConfigValue(key: string): Promise<unknown> {
    const config = this.currentUIConfig$.value;
    if (!config) {
      await this.getUIConfig().toPromise();
    }

    // Navigate nested config object
    const parts = key.split('.');
    let value: unknown = this.currentUIConfig$.value;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  // =====================================================
  // Translations
  // =====================================================

  /**
   * Get translations for a language (with caching per language)
   */
  getTranslations(language = 'en', forceRefresh = false): Observable<Record<string, Translation>> {
    const cacheKey = language;

    if (!this.translations$.has(cacheKey) || forceRefresh) {
      const translations$ = this.http.get<{ translations: Record<string, Translation> }>(`${this.apiUrl}/translations?lang=${language}`).pipe(
        map(response => response.translations),
        tap(translations => {
          const simple: Record<string, string> = {};
          Object.entries(translations).forEach(([key, trans]) => {
            simple[key] = language === 'ar' ? trans.textAr : trans.textEn;
          });
          this.currentTranslations$.next(simple);
        }),
        catchError(error => {
          devError('Error loading translations:', error);
          return of({});
        }),
        shareReplay(1)
      );

      this.translations$.set(cacheKey, translations$);
    }

    return this.translations$.get(cacheKey)!;
  }

  /**
   * Get a single translation
   */
  translate(key: string, language = 'en'): string {
    const translations = this.currentTranslations$.value;
    return translations[key] || key; // Return key if translation not found
  }

  /**
   * Interpolate variables in translation
   */
  interpolate(text: string, variables: Record<string, unknown>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }

  // =====================================================
  // Clear Cache
  // =====================================================

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.stageDefinitions$ = undefined;
    this.provisioningSteps$ = undefined;
    this.uiConfig$ = undefined;
    this.translations$.clear();

    // Also clear cache on server
    this.http.post(`${this.apiUrl}/cache/clear`, {}).subscribe();
  }
}