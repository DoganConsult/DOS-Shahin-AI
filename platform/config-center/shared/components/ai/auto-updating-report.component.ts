// ============================================
// Shahin GRC — Auto-Updating Report Component (Base)
// Base class for report components that auto-update via WebSocket
// Handles stream lifecycle, delta application, and freshness indicators
// ============================================

import { Component, Input, OnInit, OnDestroy, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ReportStreamService, ReportStreamConfig, ReportStreamEvent } from '@app/core/services/reporting/report-stream.service';
import { Subject, takeUntil } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

// === Base Component ===

@Component({
  selector: 'app-auto-updating-report',
  template: `
    <div class="auto-updating-report">
      <!-- Freshness indicator -->
      <div class="freshness-indicator" [class.stale]="isStale()">
        <i class="pi" [ngClass]="isStale() ? 'pi-clock' : 'pi-check-circle'"></i>
        <span>{{ freshnessText() }}</span>
      </div>

      <!-- Auto-update toggle -->
      <div class="auto-update-controls">
        <p-toggleButton
          [(ngModel)]="autoUpdateEnabled"
          (onChange)="toggleAutoUpdate()"
          [disabled]="!streamConnected()"
        ></p-toggleButton>
        <label>Auto-update</label>
      </div>

      <!-- Content slot (to be overridden) -->
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .auto-updating-report {
      position: relative;
    }
    .freshness-indicator {
      position: absolute;
      top: 0;
      right: 0;
      padding: 0.5rem;
      background: #e8f5e9;
      border-radius: var(--radius-xs);
      font-size: var(--font-size-base);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .freshness-indicator.stale {
      background: #fff3e0;
    }
    .auto-update-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, ToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export abstract class AutoUpdatingReportComponent implements OnInit, OnDestroy {
  @Input() reportId!: string;
  @Input() reportType!: string;
  @Input() filters?: Record<string, unknown>;
  @Input() refreshInterval = 5000;

  protected destroy$ = new Subject<void>();

  // State
  readonly reportData = signal<GrcRecord | null>(null);
  readonly lastUpdate = signal<Date | null>(null);
  readonly streamConnected = signal(false);
  readonly autoUpdateEnabled = signal(true);

  // Computed
  readonly isStale = computed(() => {
    const last = this.lastUpdate();
    if (!last) return true;
    const age = Date.now() - last.getTime();
    return age > 30000; // 30 seconds = stale
  });

  readonly freshnessText = computed(() => {
    const last = this.lastUpdate();
    if (!last) return 'No data';
    const age = Math.floor((Date.now() - last.getTime()) / 1000);
    if (age < 5) return 'Just updated';
    if (age < 30) return `Updated ${age}s ago`;
    return `Stale (${age}s ago)`;
  });

  constructor(protected streamService: ReportStreamService) {
    // Monitor stream connection
    effect(() => {
      this.streamConnected.set(this.streamService.connected());
    });
  }

  ngOnInit(): void {
    if (this.autoUpdateEnabled()) {
      this.startStream();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopStream();
  }

  /**
   * Start the report stream.
   */
  protected startStream(): void {
    if (!this.reportId || !this.reportType) return;

    const config: ReportStreamConfig = {
      reportId: this.reportId,
      reportType: this.reportType,
      filters: this.filters,
      refreshInterval: this.refreshInterval,
    };

    this.streamService
      .startStream(config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event: ReportStreamEvent) => {
          this.handleStreamEvent(event);
        },
        error: (err) => {
          console.error('[AutoUpdatingReport] Stream error:', err);
        },
      });
  }

  /**
   * Stop the report stream.
   */
  protected stopStream(): void {
    if (this.reportId) {
      this.streamService.stopStream(this.reportId);
    }
  }

  /**
   * Toggle auto-update on/off.
   */
  toggleAutoUpdate(): void {
    if (this.autoUpdateEnabled()) {
      this.startStream();
    } else {
      this.stopStream();
    }
  }

  /**
   * Handle incoming stream event.
   */
  protected handleStreamEvent(event: ReportStreamEvent): void {
    switch (event.type) {
      case 'full':
        this.reportData.set(event.data);
        this.lastUpdate.set(new Date());
        this.onDataUpdate(event.data, 'full');
        break;

      case 'delta':
        const currentData = this.reportData() || {};
        const updatedData = event.data || currentData;
        this.reportData.set(updatedData);
        this.lastUpdate.set(new Date());
        this.onDataUpdate(updatedData, 'delta', event.deltas);
        break;

      case 'heartbeat':
        // Just update timestamp
        this.lastUpdate.set(new Date());
        break;

      case 'error':
        console.error('[AutoUpdatingReport] Stream error:', event.error);
        this.onError(event.error);
        break;
    }
  }

  /**
   * Force refresh the stream.
   */
  refresh(): void {
    if (this.reportId) {
      this.streamService.refreshStream(this.reportId);
    }
  }

  /**
   * Abstract methods to be implemented by subclasses.
   */
  protected abstract onDataUpdate(data: GrcRecord, updateType: 'full' | 'delta', deltas?: GrcRecord[]): void;
  protected abstract onError(error: string | undefined): void;
}
