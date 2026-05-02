import { Component, ChangeDetectionStrategy, input, output, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/select';

/**
 * Tab 6: Pending Invitations -- shows invitations with status, email delivery, and actions.
 */
@Component({
  selector: 'app-invitations-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, AppDatePipe,
    TableModule, TagModule, ButtonModule, ToolbarModule, TooltipModule, DropdownModule,
  ],
  template: `
    <p-toolbar styleClass="mb-3">
      <div class="p-toolbar-group-start">
        <p-dropdown [options]="teamFilterOptions()" [(ngModel)]="invTeamFilter"
          (ngModelChange)="invTeamFilterSignal.set($event)"
          optionLabel="label" optionValue="value"
          [placeholder]="i18n.translate('teamManagement.filterByTeam')"
          [style]="{minWidth:'200px'}" />
      </div>
    </p-toolbar>

    <div *ngIf="invitationsLoading()" class="text-center p-4"><i class="pi pi-spin pi-spinner text-2xl"></i></div>
    <p-table aria-label="Data table" *ngIf="!invitationsLoading()" [value]="filteredInvitations()" [paginator]="true" [rows]="10"
      styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true">
      <ng-template pTemplate="header">
        <tr>
          <th>{{ i18n.translate('teamManagement.email') }}</th>
          <th>{{ i18n.translate('teamManagement.role') }}</th>
          <th>{{ i18n.translate('teamManagement.status') }}</th>
          <th>{{ i18n.translate('teamManagement.emailDelivery') }}</th>
          <th>{{ i18n.translate('teamManagement.sent') }}</th>
          <th>{{ i18n.translate('teamManagement.expires') }}</th>
          <th style="width:6rem">{{ i18n.translate('teamManagement.action') }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-inv>
        <tr>
          <td class="font-semibold">{{ inv.email }}</td>
          <td><p-tag [value]="inv.role || 'member'" [severity]="roleSeverity(inv.role)" [rounded]="true" /></td>
          <td><p-tag [value]="inv.status" [severity]="invStatusSeverity(inv.status)" [rounded]="true" /></td>
          <td>
            <p-tag *ngIf="inv.emailSent === true" [value]="i18n.translate('teamManagement.sent')" severity="success" [rounded]="true" />
            <p-tag *ngIf="inv.emailSent === false && inv.emailError" [value]="i18n.translate('teamManagement.failed')" severity="danger" [rounded]="true" [pTooltip]="inv.emailError" />
            <span *ngIf="inv.emailSent == null" class="text-color-secondary text-sm">—</span>
          </td>
          <td class="text-sm">
            @if (inv.createdAt || inv.created_at) {
              {{ (inv.createdAt || inv.created_at) | appDate:'medium' }}
            } @else {
              <span class="text-color-secondary">—</span>
            }
          </td>
          <td class="text-sm">
            @if (inv.expiresAt || inv.expires_at) {
              {{ (inv.expiresAt || inv.expires_at) | appDate:'medium' }}
            } @else {
              <span class="text-color-secondary">—</span>
            }
          </td>
          <td>
            <div class="flex gap-1">
              <button *ngIf="inv.status === 'pending' && inv.emailSent === false" pButton icon="pi pi-refresh" class="p-button-sm p-button-warning p-button-text" [pTooltip]="i18n.translate('teamManagement.resend')" (click)="resend.emit(inv)"></button>
              <button *ngIf="inv.status === 'pending'" pButton icon="pi pi-times" class="p-button-sm p-button-danger p-button-text" [pTooltip]="i18n.translate('teamManagement.revoke')" (click)="revoke.emit(inv)"></button>
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="7" class="text-center text-color-secondary p-4">
          {{ i18n.translate('teamManagement.noInvitationsFound') }}
        </td></tr>
      </ng-template>
    </p-table>
  `,
  styles: [`
    .text-sm { font-size: 0.82rem; }
  `]
})
export class InvitationsTabComponent {
  readonly i18n = inject(I18nService);

  // -- Inputs --
  invitations = input.required<any[]>();
  invitationsLoading = input<boolean>(false);
  teamFilterOptions = input.required<{ label: string; value: string }[]>();

  // -- Outputs --
  resend = output<unknown>();
  revoke = output<unknown>();

  // -- Local state --
  invTeamFilter = 'all';
  invTeamFilterSignal = signal('all');

  filteredInvitations = computed(() => {
    const filter = this.invTeamFilterSignal();
    const list = this.invitations();
    if (!filter || filter === 'all') return list;
    return list.filter((inv) => {
      const entityId = inv.entityId || inv.entity_id || inv.entityScope?.entityId || '';
      return entityId === filter;
    });
  });

  // -- Helpers --
  roleSeverity(role: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      lead: 'info', admin: 'danger', owner: 'info', manager: 'warning',
      auditor: 'warning', member: 'secondary', reviewer: 'success', approver: 'info',
    };
    return map[role?.toLowerCase()] || 'secondary';
  }

  invStatusSeverity(status: string): 'danger' | 'warning' | 'info' | 'success' | undefined {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'expired': return 'danger';
      case 'revoked': return 'danger';
      default: return undefined;
    }
  }
}
