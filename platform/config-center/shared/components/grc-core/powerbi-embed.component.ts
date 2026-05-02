import { Component, Input, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SessionService } from '@app/dauth/session/session.service';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { toErrorMessage } from '../../utils/error';

interface PowerBIEmbedToken {
  reportId: string;
  embedUrl: string;
  token: string;
  expiration?: string;
  error?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-powerbi-embed',
    imports: [CommonModule, SkeletonModule, MessageModule],
    template: `
    <div class="powerbi-container" [style.height]="height">
      <div *ngIf="loading" class="loading-skeleton">
        <p-skeleton width="100%" [height]="height" />
      </div>
      <p-message *ngIf="error" severity="warning" [text]="error" styleClass="w-full" />
      <div #embedContainer class="embed-frame" [hidden]="loading || !!error"></div>
    </div>
  `,
    styles: [`
    .powerbi-container { width: 100%; position: relative; border-radius: var(--radius); overflow: hidden; }
    .loading-skeleton { width: 100%; }
    .embed-frame { width: 100%; height: 100%; }
    .embed-frame iframe { border: none; width: 100%; height: 100%; }
  `]
})
export class PowerBIEmbedComponent implements AfterViewInit, OnDestroy {
  @Input() reportId = '';
  @Input() height = '600px';
  @ViewChild('embedContainer', { static: false }) embedContainer!: ElementRef;

  loading = true;
  error = '';
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private powerbiService: unknown;

  private http = inject(HttpClient);
  private authService = inject(SessionService);

  async ngAfterViewInit() {
    await this.loadReport();
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  private async loadReport() {
    this.loading = true;
    this.error = '';

    try {
      let token: string | null = null;
      try { token = await this.authService.getToken(); } catch { /* not logged in */ }
      if (!token) {
        this.error = 'Not authenticated';
        this.loading = false;
        return;
      }

      // Fetch embed token from backend via Angular HttpClient (uses interceptors)
      const path = this.reportId
        ? `/api/powerbi/embed-token?reportId=${encodeURIComponent(this.reportId)}`
        : '/api/powerbi/embed-token';

      const embedData = await new Promise<PowerBIEmbedToken>((resolve, reject) => {
        this.http.get<PowerBIEmbedToken>(path).subscribe({ next: resolve, error: reject });
      });

      if (embedData.error) {
        this.error = embedData.error;
        this.loading = false;
        return;
      }

      await this.embedReport(embedData);

      // Schedule token refresh (45 minutes before expiry)
      if (embedData.expiration) {
        const expiresAt = new Date(embedData.expiration).getTime();
        const refreshIn = Math.max(expiresAt - Date.now() - 45 * 60 * 1000, 60000);
        this.refreshTimer = setTimeout(() => this.loadReport(), refreshIn);
      }
    } catch (err: unknown) {
      this.error = toErrorMessage(err) || 'Failed to embed Power BI report';
    } finally {
      this.loading = false;
    }
  }

  private async embedReport(embedData: PowerBIEmbedToken) {
    try {
      const pbi = await import('powerbi-client');
      this.powerbiService = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory,
      );

      const config = {
        type: 'report' as const,
        id: embedData.reportId,
        embedUrl: embedData.embedUrl,
        accessToken: embedData.token,
        tokenType: 1, // Embed token
        settings: {
          panes: {
            filters: { visible: false },
            pageNavigation: { visible: true },
          },
          background: 1, // Transparent
        },
      };

      const container = this.embedContainer.nativeElement;
      (this.powerbiService as { embed(el: HTMLElement, cfg: typeof config): void }).embed(container, config);
    } catch (err: unknown) {
      this.error = 'Failed to initialize Power BI embed: ' + (toErrorMessage(err) || '');
    }
  }
}
