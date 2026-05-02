import { Component, Input, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { InputTextarea } from 'primeng/textarea';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-comment-thread',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, ButtonModule, InputTextarea],
  template: `
    <div class="comment-thread">
      <h4>{{ i18n.translate('comments.title') || 'Comments' }} ({{ comments.length }})</h4>
      <div class="comment-input">
        <textarea pInputTextarea [(ngModel)]="newComment" rows="2"
          [placeholder]="i18n.translate('comments.placeholder') || 'Add a comment... Use @name to mention'" [attr.aria-label]="i18n.translate('comments.placeholder') || 'Add a comment... Use @name to mention'"></textarea>
        <button pButton [label]="i18n.translate('comments.post') || 'Post'" icon="pi pi-send"
          class="p-button-sm" (click)="postComment()" [disabled]="!newComment.trim()"></button>
      </div>
      <div class="comment-list">
        <div *ngFor="let c of topLevelComments" class="comment-item">
          <div class="comment-header">
            <span class="comment-author">{{ c.author_name || c.user_id }}</span>
            <span class="comment-date">{{ c.created_at | appDate:'short' }}</span>
          </div>
          <div class="comment-body">{{ c.content }}</div>
          <button pButton class="p-button-text p-button-sm" icon="pi pi-reply"
            [label]="i18n.translate('comments.reply') || 'Reply'" (click)="replyTo = c.comment_id"></button>
          <div *ngIf="replyTo === c.comment_id" class="reply-input">
            <textarea pInputTextarea [(ngModel)]="replyText" rows="1"
              [placeholder]="i18n.translate('comments.replyPlaceholder') || 'Reply...'" [attr.aria-label]="i18n.translate('comments.replyPlaceholder') || 'Reply...'"></textarea>
            <button pButton class="p-button-sm" [label]="i18n.translate('comments.send') || 'Send'"
              (click)="postReply(c.comment_id)" [disabled]="!replyText.trim()"></button>
          </div>
          <div *ngFor="let r of getReplies(c.comment_id)" class="comment-reply">
            <span class="comment-author">{{ r.author_name || r.user_id }}</span>
            <span class="comment-date">{{ r.created_at | appDate:'short' }}</span>
            <div class="comment-body">{{ r.content }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comment-thread { padding: 12px 0; }
    .comment-input { display: flex; gap: 8px; margin-bottom: 16px; align-items: flex-end; }
    .comment-input textarea { flex: 1; }
    .comment-list { display: flex; flex-direction: column; gap: 12px; }
    .comment-item { padding: 10px; background: var(--surface-card); border-radius: var(--radius); border: 1px solid var(--surface-border); }
    .comment-header { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
    .comment-author { font-weight: 600; font-size: var(--font-size-sm); }
    .comment-date { font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .comment-body { font-size: var(--font-size-sm); line-height: 1.5; margin-bottom: 4px; }
    .reply-input { display: flex; gap: 8px; margin-top: 8px; align-items: flex-end; }
    .reply-input textarea { flex: 1; }
    .comment-reply { margin-inline-start: 24px; padding: 8px; background: var(--surface-ground); border-radius: var(--radius-sm); margin-top: 6px; }
  `]
})
export class CommentThreadComponent implements OnInit {
  @Input() entityType = '';
  @Input() entityId = '';

  comments: { comment_id: string; content: string; author_name?: string; user_id?: string; created_at?: string; parent_comment_id?: string }[] = [];
  newComment = '';
  replyTo: string | null = null;
  replyText = '';

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.loadComments(); }

  get topLevelComments() { return this.comments.filter(c => !c.parent_comment_id); }

  getReplies(parentId: string) { return this.comments.filter(c => c.parent_comment_id === parentId); }

  loadComments() {
    if (!this.entityType || !this.entityId) { this.comments = []; return; }
    this.apiclientSvc.get(`/comments/${this.entityType}/${this.entityId}`).subscribe({
      next: (data: any) => this.comments = (data?.['comments'] ?? data ?? []) as typeof this.comments,
      error: () => this.comments = []
    });
  }

  postComment() {
    if (!this.newComment.trim()) return;
    this.apiclientSvc.post('/comments', { entity_type: this.entityType, entity_id: this.entityId, content: this.newComment }).subscribe({
      next: () => { this.newComment = ''; this.loadComments(); }
    });
  }

  postReply(parentId: string) {
    if (!this.replyText.trim()) return;
    this.apiclientSvc.post('/comments', { entity_type: this.entityType, entity_id: this.entityId, content: this.replyText, parent_comment_id: parentId }).subscribe({
      next: () => { this.replyText = ''; this.replyTo = null; this.loadComments(); }
    });
  }

}
