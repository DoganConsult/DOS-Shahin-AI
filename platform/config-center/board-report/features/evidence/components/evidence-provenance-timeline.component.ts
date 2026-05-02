/**
 * Evidence Provenance Timeline Component
 *
 * Vertical timeline showing the provenance history of a piece of evidence.
 * Each event is rendered as a timeline node with icon, timestamp, actor,
 * description, and expandable metadata. Events are color-coded by type.
 */
import { Component, Input, OnInit, OnChanges, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface ProvenanceEvent {
  eventId: string;
  eventType: 'created' | 'version_uploaded' | 'status_changed' | 'reviewed' | 'approved' | 'rejected' | 'used_in_assertion' | 'legal_hold';
  timestamp: string;
  actor: string;
  description: string;
  descriptionAr?: string;
  metadata?: Record<string, unknown>;
}

/** Map event types to text labels (no emojis) */
const EVENT_LABELS: Record<string, { en: string; ar: string; cssClass: string }> = {
  created:             { en: 'Created',           ar: 'تم الإنشاء',          cssClass: 'evt-created' },
  version_uploaded:    { en: 'Version Uploaded',  ar: 'تم رفع نسخة',        cssClass: 'evt-uploaded' },
  status_changed:      { en: 'Status Changed',    ar: 'تغيير الحالة',        cssClass: 'evt-status' },
  reviewed:            { en: 'Reviewed',           ar: 'تمت المراجعة',        cssClass: 'evt-reviewed' },
  approved:            { en: 'Approved',           ar: 'تمت الموافقة',        cssClass: 'evt-approved' },
  rejected:            { en: 'Rejected',           ar: 'مرفوض',              cssClass: 'evt-rejected' },
  used_in_assertion:   { en: 'Used in Assertion', ar: 'مستخدم في تأكيد',    cssClass: 'evt-assertion' },
  legal_hold:          { en: 'Legal Hold',         ar: 'حجز قانوني',         cssClass: 'evt-legal' },
};

@Component({
  selector: 'app-evidence-provenance-timeline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="provenance-timeline">
      <h3 class="timeline-title">Evidence Provenance / سجل مصدر الدليل</h3>

      @if (loading()) {
        <div class="loading-text">Loading timeline... / جاري تحميل السجل...</div>
      }

      @if (!loading() && error()) {
        <div class="error-text">{{ error() }}</div>
      }

      @if (!loading() && events().length === 0 && !error()) {
        <div class="empty-text">
          <p>No provenance events found.</p>
          <p class="rtl">لا توجد أحداث مسجلة.</p>
        </div>
      }

      <div class="timeline-container">
        @for (evt of events(); track evt.eventId) {
          <div class="timeline-node" [class]="getEventClass(evt.eventType)">
            <!-- Timeline connector line -->
            <div class="timeline-line">
              <div class="timeline-dot"></div>
            </div>

            <!-- Event content -->
            <div class="event-card"
                 [class.expanded]="expandedEvent() === evt.eventId"
                 (click)="toggleEvent(evt.eventId)">
              <div class="event-header">
                <span class="event-type-label">{{ getEventLabel(evt.eventType) }}</span>
                <span class="event-timestamp">{{ evt.timestamp | date:'medium' }}</span>
              </div>
              <div class="event-body">
                <span class="event-actor">{{ evt.actor }}</span>
                <span class="event-desc">{{ evt.description }}</span>
                @if (evt.descriptionAr) {
                  <span class="event-desc-ar">{{ evt.descriptionAr }}</span>
                }
              </div>

              <!-- Expandable metadata -->
              @if (expandedEvent() === evt.eventId && evt.metadata) {
                <div class="event-metadata">
                  <h5>Metadata / البيانات الوصفية</h5>
                  <div class="metadata-grid">
                    @for (key of getMetadataKeys(evt.metadata); track key) {
                      <div class="meta-row">
                        <span class="meta-key">{{ key }}</span>
                        <span class="meta-value">{{ evt.metadata![key] }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .provenance-timeline { background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: 8px; padding: 16px; }
    .timeline-title { font-size: 15px; font-weight: 600; margin: 0 0 16px 0; color: var(--primary-color, #89b4fa); }
    .loading-text, .empty-text { font-size: 13px; color: var(--text-color-secondary, #a6adc8); padding: 12px 0; }
    .error-text { font-size: 13px; color: #f38ba8; padding: 12px 0; }
    .rtl { direction: rtl; }

    /* Timeline container */
    .timeline-container { position: relative; padding-left: 32px; }

    /* Timeline node */
    .timeline-node { position: relative; margin-bottom: 4px; }

    /* Vertical line */
    .timeline-line { position: absolute; left: -32px; top: 0; bottom: -4px; width: 2px; background: var(--surface-border, #313244); }
    .timeline-node:last-child .timeline-line { bottom: 50%; }

    /* Dot on the line */
    .timeline-dot { position: absolute; top: 14px; left: -5px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--surface-card, #1e1e2e); }

    /* Color-coded dots by event type */
    .evt-created .timeline-dot { background: #89b4fa; }
    .evt-uploaded .timeline-dot { background: #74c7ec; }
    .evt-status .timeline-dot { background: #f9e2af; }
    .evt-reviewed .timeline-dot { background: #cba6f7; }
    .evt-approved .timeline-dot { background: #a6e3a1; }
    .evt-rejected .timeline-dot { background: #f38ba8; }
    .evt-assertion .timeline-dot { background: #fab387; }
    .evt-legal .timeline-dot { background: #f5c2e7; }

    /* Event card */
    .event-card { background: var(--surface-ground, #11111b); border: 1px solid var(--surface-border, #313244); border-radius: 6px; padding: 10px 12px; cursor: pointer; transition: border-color 0.15s; }
    .event-card:hover { border-color: var(--primary-color, #89b4fa); }
    .event-card.expanded { border-color: var(--primary-color, #89b4fa); }

    .event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .event-type-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .evt-created .event-type-label { color: #89b4fa; }
    .evt-uploaded .event-type-label { color: #74c7ec; }
    .evt-status .event-type-label { color: #f9e2af; }
    .evt-reviewed .event-type-label { color: #cba6f7; }
    .evt-approved .event-type-label { color: #a6e3a1; }
    .evt-rejected .event-type-label { color: #f38ba8; }
    .evt-assertion .event-type-label { color: #fab387; }
    .evt-legal .event-type-label { color: #f5c2e7; }

    .event-timestamp { font-size: 11px; color: var(--text-color-secondary, #6c7086); }

    .event-body { font-size: 12px; }
    .event-actor { font-weight: 600; margin-right: 6px; }
    .event-desc { color: var(--text-color, #cdd6f4); }
    .event-desc-ar { display: block; font-size: 11px; direction: rtl; color: var(--text-color-secondary, #a6adc8); margin-top: 2px; }

    /* Metadata */
    .event-metadata { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--surface-border, #313244); }
    .event-metadata h5 { font-size: 11px; margin: 0 0 6px 0; color: var(--text-color-secondary, #a6adc8); }
    .metadata-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 4px; }
    .meta-row { display: contents; font-size: 11px; }
    .meta-key { color: var(--text-color-secondary, #6c7086); font-family: monospace; }
    .meta-value { color: var(--text-color, #cdd6f4); word-break: break-all; }
  `],
})
export class EvidenceProvenanceTimelineComponent implements OnInit, OnChanges {
  private http = inject(HttpClient);

  /** Evidence ID whose provenance to display */
  @Input() evidenceId = '';

  events = signal<ProvenanceEvent[]>([]);
  loading = signal(false);
  error = signal('');
  expandedEvent = signal<string | null>(null);

  ngOnInit(): void {
    if (this.evidenceId) this.loadProvenance();
  }

  ngOnChanges(): void {
    if (this.evidenceId) {
      this.events.set([]);
      this.loadProvenance();
    }
  }

  /** Fetch provenance events from API */
  loadProvenance(): void {
    if (!this.evidenceId) return;
    this.loading.set(true);
    this.error.set('');
    this.http.get<{ events: ProvenanceEvent[] }>(
      `/api/compliance-assertions/evidence/${this.evidenceId}/provenance`
    ).subscribe({
      next: (res) => { this.events.set(res.events || []); this.loading.set(false); },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load provenance');
        this.loading.set(false);
      },
    });
  }

  /** Toggle expanded metadata view for an event */
  toggleEvent(eventId: string): void {
    this.expandedEvent.update(v => v === eventId ? null : eventId);
  }

  /** Get CSS class for an event type */
  getEventClass(eventType: string): string {
    return EVENT_LABELS[eventType]?.cssClass ?? 'evt-created';
  }

  /** Get display label for an event type */
  getEventLabel(eventType: string): string {
    return EVENT_LABELS[eventType]?.en ?? eventType.replace(/_/g, ' ');
  }

  /** Get keys of a metadata object for iteration */
  getMetadataKeys(metadata: any): string[] {
    return Object.keys(metadata);
  }
}
