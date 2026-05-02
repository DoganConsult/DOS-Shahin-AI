import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';

/**
 * Native share sheet and in-app browser for GRC document sharing.
 *
 * Enables compliance officers to share:
 * - Audit reports via email/WhatsApp/Teams
 * - Risk summaries with executive stakeholders
 * - Evidence links with auditors
 * - Compliance status with regulators
 */
@Injectable({ providedIn: 'root' })
export class MobileShareService {
  private readonly isNative = Capacitor.isNativePlatform();

  /**
   * Open the native share sheet.
   */
  async share(opts: {
    title: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }): Promise<void> {
    if (this.isNative) {
      await Share.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
        dialogTitle: opts.dialogTitle || 'Share from Shahin GRC',
      });
    } else {
      // Web fallback — navigator.share API
      if (navigator.share) {
        await navigator.share({
          title: opts.title,
          text: opts.text,
          url: opts.url,
        });
      }
    }
  }

  /**
   * Share a risk summary.
   */
  async shareRisk(risk: { title: string; score: number; status: string; id: string }): Promise<void> {
    await this.share({
      title: `Risk: ${risk.title}`,
      text: `Risk Score: ${risk.score} | Status: ${risk.status}`,
      url: `${window.location.origin}/risks/${risk.id}`,
    });
  }

  /**
   * Share an audit report.
   */
  async shareAuditReport(report: { title: string; id: string }): Promise<void> {
    await this.share({
      title: `Audit Report: ${report.title}`,
      text: 'View the full audit report in Shahin GRC',
      url: `${window.location.origin}/audit/${report.id}`,
    });
  }

  /**
   * Share compliance status.
   */
  async shareComplianceStatus(framework: { name: string; completion: number; id: string }): Promise<void> {
    await this.share({
      title: `${framework.name} Compliance`,
      text: `Compliance: ${framework.completion}% complete`,
      url: `${window.location.origin}/frameworks/${framework.id}`,
    });
  }

  /**
   * Open a URL in the native in-app browser (Safari/Chrome custom tab).
   */
  async openInAppBrowser(url: string): Promise<void> {
    if (this.isNative) {
      await Browser.open({
        url,
        presentationStyle: 'popover',
        toolbarColor: '#0c1a2e',
      });
    } else {
      window.open(url, '_blank');
    }
  }
}
