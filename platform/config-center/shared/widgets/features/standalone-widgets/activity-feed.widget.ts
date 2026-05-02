import { Component, Input, OnInit, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EntityUrlBuilderService } from '@app/core/services/entity-url-builder.service';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-activity-feed-widget',
  standalone: true,
  imports: [CommonModule, AppDatePipe],
  template: `
    <div class="activity-feed">
      <h4 *ngIf="!entityId">{{ i18n.translate('activity.title') || 'Recent Activity' }}</h4>
      <div *ngIf="activities.length === 0" class="empty">{{ i18n.translate('activity.empty') || 'No recent activity' }}</div>
      <div *ngFor="let a of activities" class="activity-item">
        <div class="activity-icon"><i class="pi" [ngClass]="getIcon(a.action)"></i></div>
        <div class="activity-content">
          <span class="activity-user">{{ a.user_name || a.user_id }}</span>
          <span class="activity-action">{{ a.action }}</span>
          <span class="activity-module" *ngIf="a.module">{{ a.module }}</span>
          <div class="activity-desc" *ngIf="a.description">{{ a.description }}</div>
          <!-- GAP-001 Fix: Add clickable deep links to entity references -->
          <div class="activity-entity" *ngIf="a.entity_type && a.entity_id" 
               (click)="navigateToEntity(a.entity_type, a.entity_id)"
               [attr.aria-label]="'View ' + (a.entity_title || a.entity_type)">
            <i class="pi pi-external-link"></i>
            <span class="entity-link">{{ a.entity_title || a.entity_type }} #{{ a.entity_id }}</span>
          </div>
          <div class="activity-time">{{ a.created_at | appDate:'short' }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Activity Feed — Enterprise Glassmorphism ── */
    .activity-feed { padding: 8px 0; }

    .activity-item {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
      margin-bottom: 8px;
      border-radius: var(--radius, 12px);
      background: var(--glass-icon-bg, rgba(14, 165, 233, 0.04));
      border: 1px solid var(--border-subtle, var(--border-subtle));
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .activity-item:hover {
      background: rgba(14, 165, 233, 0.08);
      border-color: var(--glass-icon-border, rgba(14, 165, 233, 0.18));
      transform: translateX(4px);
      box-shadow: var(--shadow-md);
    }
    .activity-item:last-child { margin-bottom: 0; }

    /* ── Icon — glass circle ── */
    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-pill);
      background: var(--glass-icon-bg, rgba(14, 165, 233, 0.08));
      border: 1px solid var(--glass-icon-border, rgba(14, 165, 233, 0.18));
      box-shadow: var(--glass-icon-shadow, 0 4px 16px rgba(14, 165, 233, 0.10));
      backdrop-filter: blur(var(--glass-icon-blur, 12px));
      -webkit-backdrop-filter: blur(var(--glass-icon-blur, 12px));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .activity-item:hover .activity-icon {
      background: rgba(14, 165, 233, 0.14);
      border-color: rgba(14, 165, 233, 0.28);
      transform: scale(1.08);
    }
    .activity-icon .pi {
      font-size: var(--font-size-base);
      color: var(--primary, var(--primary));
    }

    .activity-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .activity-user {
      font-weight: var(--font-bold, 700);
      font-size: var(--font-size-sm);
      color: var(--text-heading, #0c4a6e);
      letter-spacing: -0.01em;
    }

    .activity-action {
      font-size: var(--font-size-sm);
      color: var(--text-muted, #5e6e80);
    }

    .activity-module {
      display: inline-block;
      font-size: var(--font-size-xs);
      font-weight: var(--font-bold, 700);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 3px 10px;
      border-radius: var(--radius-pill, 99px);
      background: var(--glass-icon-bg, rgba(14, 165, 233, 0.08));
      border: 1px solid var(--glass-icon-border, rgba(14, 165, 233, 0.18));
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      color: var(--primary, var(--primary));
      width: fit-content;
    }

    .activity-desc {
      font-size: var(--font-size-sm);
      color: var(--text-muted, #5e6e80);
      margin-top: 2px;
      line-height: 1.5;
    }

    .activity-time {
      font-size: var(--font-size-xs);
      color: var(--text-muted, var(--text-muted));
      font-weight: 500;
    }

    /* GAP-001 Fix: Entity link styling */
    .activity-entity {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      padding: 4px 8px;
      border-radius: var(--radius-xs, 6px);
      background: var(--glass-icon-bg, rgba(14, 165, 233, 0.06));
      border: 1px solid var(--glass-icon-border, rgba(14, 165, 233, 0.12));
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
      width: fit-content;
    }
    .activity-entity:hover {
      background: rgba(14, 165, 233, 0.12);
      border-color: rgba(14, 165, 233, 0.24);
      transform: translateX(2px);
    }
    .activity-entity .pi {
      font-size: var(--font-size-xs);
      color: var(--primary, var(--primary));
    }
    .activity-entity .entity-link {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--primary, var(--primary));
      text-decoration: none;
    }
    .activity-entity:hover .entity-link {
      text-decoration: underline;
    }

    /* ── Empty state — glass container ── */
    .empty {
      padding: 32px 20px;
      text-align: center;
      color: var(--text-muted, var(--text-muted));
      font-size: var(--font-size-sm);
      background: var(--glass-icon-bg, rgba(14, 165, 233, 0.04));
      border: 1px dashed var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius, 12px);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
  `]
})
export class ActivityFeedWidgetComponent implements OnInit {
  @Input() module = '';
  @Input() entityId = '';
  activities: { user_name?: string; user_id?: string; action: string; module?: string; description?: string; created_at: string }[] = [];

  private router = inject(Router);
  private entityUrlBuilder = inject(EntityUrlBuilderService);


  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.apiclientSvc.get(`/activity-feed${this.module ? '?module=' + this.module : ''}`).subscribe({
      next: (data: any) => this.activities = Array.isArray(data) ? data : ((data?.['activities'] as typeof this.activities) || []),
      error: () => this.activities = []
    });
  }

  getIcon(action: string): string {
    const map: Record<string, string> = {
      create: 'pi-plus', update: 'pi-pencil', delete: 'pi-trash',
      approve: 'pi-check', reject: 'pi-times', comment: 'pi-comment'
    };
    return map[action] || 'pi-circle';
  }

  /**
   * GAP-001 Fix: Navigate to entity detail page when entity link is clicked
   */
  navigateToEntity(entityType: string, entityId: string): void {
    const url = this.entityUrlBuilder.buildEntityUrl(entityType, entityId);
    this.router.navigateByUrl(url);
  }

}
