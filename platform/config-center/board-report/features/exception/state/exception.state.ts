import { Injectable, signal, computed } from '@angular/core';
import type { ExceptionContract, ExceptionStatus, ExceptionType } from '../contracts/exception.contracts';

@Injectable({ providedIn: 'root' })
export class ExceptionState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _exceptions = signal<ExceptionContract[]>([]);
  private readonly _selectedExceptionId = signal<string | null>(null);
  private readonly _filterStatus = signal<ExceptionStatus | null>(null);
  private readonly _filterType = signal<ExceptionType | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly exceptions = this._exceptions.asReadonly();
  readonly selectedExceptionId = this._selectedExceptionId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly filterType = this._filterType.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._exceptions().length === 0);
  readonly totalCount = computed(() => this._exceptions().length);
  readonly selectedException = computed(() => this._exceptions().find(e => e.exceptionId === this._selectedExceptionId()) ?? null);
  readonly expiringCount = computed(() => this._exceptions().filter(e => e.status === 'expiring').length);
  readonly activeCount = computed(() => this._exceptions().filter(e => e.status === 'active').length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setExceptions(v: ExceptionContract[]): void { this._exceptions.set(v); }
  selectException(id: string | null): void { this._selectedExceptionId.set(id); }
  setFilterStatus(v: ExceptionStatus | null): void { this._filterStatus.set(v); }
  setFilterType(v: ExceptionType | null): void { this._filterType.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._exceptions.set([]);
    this._selectedExceptionId.set(null);
    this._filterStatus.set(null);
    this._filterType.set(null);
  }
}
