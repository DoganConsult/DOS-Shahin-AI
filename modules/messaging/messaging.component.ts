import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from '@app/core/services/api-client.service';
import { EmptyStateComponent } from '@app/shared/components';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';
import { PageShellComponent } from '@app/shared/components/page-chrome/page-shell.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  receivedAt: string;
  isRead: boolean;
  hasAttachments: boolean;
  labels: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-messaging',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, ButtonModule, InputTextModule],
  template: `
    <app-page-shell icon="comments" [title]="i18n.translate('messaging.title')" [subtitle]="i18n.translate('messaging.subtitle')" [breadcrumbs]="[i18n.translate('nav.dashboard'), i18n.translate('messaging.breadcrumb')]" [loading]="loading">
      <div class="grid" style="min-height: 500px">
        <div class="col-3 surface-card border-round p-3">
          <h4 class="mt-0">{{i18n.translate('messaging.channels')}}</h4>
          <div tabindex="0" role="button" (keyup.enter)="selectChannel(ch)" *ngFor="let ch of channels" class="p-2 cursor-pointer border-round" [class.surface-hover]="selectedChannel?.channelId !== ch.channelId" [class.bg-primary-reverse]="selectedChannel?.channelId === ch.channelId" (click)="selectChannel(ch)">
            <i class="pi pi-hashtag mr-2"></i>{{ch.name}}
          </div>
        </div>
        <div class="col-9">
          <div *ngIf="selectedChannel" class="flex flex-column h-full">
            <h4 class="mt-0">#{{selectedChannel.name}}</h4>
            <div class="flex-1 overflow-auto" style="max-height: 400px">
              <div *ngFor="let msg of messages" class="mb-3">
                <span class="font-semibold text-primary">{{msg.senderId}}</span>
                <span class="text-xs text-color-secondary ml-2">{{msg.createdAt | appDate:'short'}}</span>
                <div class="mt-1">{{msg.content}}</div>
              </div>
              <div *ngIf="messages.length === 0" class="text-center text-color-secondary p-5">{{i18n.translate('messaging.noMessages')}}</div>
            </div>
            <div class="flex gap-2 mt-3">
              <input pInputText [(ngModel)]="newMessage" [placeholder]="i18n.translate('messaging.typeMessage')" [attr.aria-label]="i18n.translate('messaging.typeMessage')" class="flex-1" (keyup.enter)="sendMessage()" />
              <button pButton icon="pi pi-send" (click)="sendMessage()"></button>
            </div>
          </div>
        </div>
      </div>
    </app-page-shell>
  `
})
export class MessagingComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  channels: Record<string, unknown>[] = [];
  messages: Record<string, unknown>[] = [];
  selectedChannel: Record<string, unknown> | null = null;
  newMessage = '';
  loading = true;

  private api = inject(ApiClientService);
  constructor(public i18n: I18nService) {}

  ngOnInit() {
    this.api.get('/messaging/channels').subscribe({
      next: (data: any) => { this.channels = data; this.loading = false; this.cdr.markForCheck(); if (data.length > 0) this.selectChannel(data[0]); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  selectChannel(ch: Record<string, unknown>) {
    this.selectedChannel = ch;
    this.api.get(`/messaging/channels/${ch.channelId}/messages`).subscribe({
      next: (data: any) => { this.messages = (data || []).reverse(); this.cdr.markForCheck(); }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChannel) return;
    this.api.post(`/messaging/channels/${this.selectedChannel.channelId}/messages`, { content: this.newMessage }).subscribe({
      next: (msg: Record<string, unknown>) => { this.messages.push(msg); this.newMessage = ''; this.cdr.markForCheck(); }
    });
  }

}
