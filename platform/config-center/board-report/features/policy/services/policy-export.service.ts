import { Injectable, inject } from '@angular/core';
import { PolicyApiService } from './policy-api.service';

/**
 * Handles client-side export operations for policy data.
 * Delegates report generation to the backend and triggers browser downloads.
 */
@Injectable({ providedIn: 'root' })
export class PolicyExportService {
  private policyApi = inject(PolicyApiService);

  /**
   * Export the policy list in the requested format.
   * Fetches data from the API, converts if needed, and triggers a download.
   */
  exportPolicies(format: 'csv' | 'excel' | 'pdf', filters?: any): void {
    this.policyApi.list(filters).subscribe((res) => {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `policies_${timestamp}`;

      if (format === 'csv') {
        const columns = ['id', 'title', 'status', 'category', 'ownerName', 'version', 'effectiveDate', 'reviewDate'];
        const csv = this.convertToCSV(res.data, columns);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        this.downloadBlob(blob, `${filename}.csv`);
      } else if (format === 'excel') {
        // Excel export delegates to backend which returns a binary blob
        const csv = this.convertToCSV(res.data, Object.keys(res.data[0] ?? {}));
        const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
        this.downloadBlob(blob, `${filename}.xls`);
      } else if (format === 'pdf') {
        // PDF generation is handled server-side via the reports endpoint
        this.policyApi.runReport({ type: 'policy_list', format: 'pdf', filters }).subscribe((report: any) => {
          if (report?.url) {
            window.open(report.url, '_blank');
          }
        });
      }
    });
  }

  /** Export acknowledgment proof for a publication campaign. */
  exportAcknowledgmentProof(campaignId: string): void {
    this.policyApi.getPublicationStatus(campaignId).subscribe((status: any) => {
      const columns = ['userName', 'email', 'acknowledgedAt', 'status'];
      const csv = this.convertToCSV(status.acknowledgments ?? [], columns);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, `acknowledgment_proof_${campaignId}.csv`);
    });
  }

  /** Export a named report with arbitrary data payload. */
  exportReport(reportType: string, data: any): void {
    this.policyApi.runReport({ type: reportType, ...data }).subscribe((report: any) => {
      if (report?.url) {
        window.open(report.url, '_blank');
      } else if (report?.rows) {
        const columns = Object.keys(report.rows[0] ?? {});
        const csv = this.convertToCSV(report.rows, columns);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        this.downloadBlob(blob, `${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Trigger a browser download for a Blob. */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Convert an array of objects to a CSV string using the specified column keys. */
  private convertToCSV(data: any[], columns: string[]): string {
    if (!data?.length) return columns.join(',') + '\n';

    const header = columns.join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col] ?? '';
          // Escape values containing commas, quotes, or newlines
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(','),
    );
    return [header, ...rows].join('\n');
  }
}
