import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-comment',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, TagModule, ButtonModule, DropdownModule, ToolbarModule],
    template: `
    <app-page-shell icon="comments" [title]="'Comments & Discussions'"
      [subtitle]="'Cross-module comment threads and collaboration'"
      [breadcrumbs]="['Dashboard', 'Comments']" [loading]="loading">
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="entityTypes" [(ngModel)]="selectedType" placeholder="Entity Type" (onChange)="loadComments()" />
        </ng-template>
      </p-toolbar>
      <div class="comment-list">
        <div *ngFor="let c of comments" class="comment-item">
          <div class="comment-avatar">{{ (c.user_name || 'U')[0] }}</div>
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-user">{{ c.user_name || 'User' }}</span>
              <p-tag [value]="c.entity_type" severity="info" />
              <span class="comment-time">{{ c.created_at | appDate:'short' }}</span>
            </div>
            <p class="comment-text">{{ c.content }}</p>
          </div>
          <p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true" (onClick)="deleteComment(c.comment_id)" />
        </div>
        <div *ngIf="comments.length === 0 && !loading" class="empty-state">
          <i class="pi pi-comments empty-icon"></i>
          <p>No comments yet</p>
        </div>
      </div>
    </app-page-shell>
  `,
    styles: [`
    .mb-3{margin-bottom:16px}.comment-list{display:flex;flex-direction:column;gap:8px}
    .comment-item{display:flex;gap:12px;padding:14px;border-radius:var(--radius-md);border:1px solid var(--border,var(--border-subtle));background:#fff;align-items:flex-start}
    .comment-avatar{width:36px;height:36px;border-radius:var(--radius-pill);background:var(--primary,#1e40af);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size: var(--font-size-base);flex-shrink:0}
    .comment-body{flex:1;min-width:0}
    .comment-header{display:flex;align-items:center;gap:8px;margin-bottom:4px}
    .comment-user{font-weight:700;font-size: var(--font-size-sm)}
    .comment-time{font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted));margin-inline-start:auto}
    .comment-text{font-size: var(--font-size-sm);margin:0;color:var(--text,#334155)}
    .empty-state{text-align:center;padding:48px;color:var(--text-muted)}
    .empty-icon{font-size:48px;display:block;margin-bottom:12px}
  `]
})
export class CommentComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; comments: Record<string, unknown>[] = [];
  selectedType = 'risk';
  entityTypes = [
    { label: 'Risk', value: 'risk' }, { label: 'Control', value: 'control' },
    { label: 'Policy', value: 'policy' }, { label: 'Finding', value: 'finding' },
  ];
  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}
  ngOnInit() { this.loadComments(); }
  loadComments() {
    this.loading = true;
    this.operationsSvc.getComments(this.selectedType, 'all').subscribe({
      next: (d: Record<string, unknown>) => { this.comments = Array.isArray(d) ? d : d.comments || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
  deleteComment(id: string) { this.operationsSvc.deleteComment(id).subscribe({ next: () => this.loadComments() }); }

}
