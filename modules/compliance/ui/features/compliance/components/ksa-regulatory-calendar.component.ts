// ============================================
// KSA Regulatory Calendar Component
// Visual timeline of regulatory deadlines, reporting cycles, renewal dates
// ============================================

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GovernanceApiService } from '@app/core/services/api-clients/ai/governance-api.service';
import { KsaRegulatoryApiService } from '../services/ksa-regulatory-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';
import { ButtonModule, DatePickerModule, DropdownModule, NotificationModule, PlaceholderModule, TagModule, TilesModule, TooltipModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

interface RegulatoryDeadline {
  regulatorCode: string;
  frameworkCode: string;
  deadlineType: string;
  dueDate: string;
  descriptionEn: string;
  descriptionAr: string;
  severity: string;
  daysUntil: number;
}

@Component({
  selector: 'app-ksa-regulatory-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TilesModule,
    TagModule,
    ButtonModule,
    DatePickerModule,
    DropdownModule,
    TooltipModule,
    PlaceholderModule,
    NotificationModule,
  ],
  providers: [],
  templateUrl: './ksa-regulatory-calendar.component.html',
  styleUrls: ['./ksa-regulatory-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KsaRegulatoryCalendarComponent implements OnInit {
  private messageService = inject(MessageService);
  loading = signal(false);
  deadlines = signal<RegulatoryDeadline[]>([]);
  selectedRegulator = signal<string | null>(null);
  selectedTimeframe = signal<'upcoming' | 'overdue' | 'all'>('upcoming');
  complianceSummary = signal<GrcRecord | null>(null);

  regulatorOptions = [
    { label: 'All Regulators', value: null },
    { label: 'NCA', value: 'REG-KSA-NCA' },
    { label: 'SAMA', value: 'REG-KSA-SAMA' },
    { label: 'SDAIA', value: 'REG-KSA-SDAIA' },
    { label: 'CST', value: 'REG-KSA-CST' },
    { label: 'MOH', value: 'REG-KSA-MOH' },
  ];

  timeframeOptions = [
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'All', value: 'all' },
  ];

  filteredDeadlines = computed(() => {
    let filtered = this.deadlines();

    if (this.selectedRegulator()) {
      filtered = filtered.filter(d => d.regulatorCode === this.selectedRegulator());
    }

    if (this.selectedTimeframe() === 'upcoming') {
      filtered = filtered.filter(d => d.daysUntil >= 0);
    } else if (this.selectedTimeframe() === 'overdue') {
      filtered = filtered.filter(d => d.daysUntil < 0);
    }

    // Sort by days until (ascending - most urgent first)
    return filtered.sort((a, b) => a.daysUntil - b.daysUntil);
  });

  upcomingCount = computed(() => 
    this.deadlines().filter(d => d.daysUntil >= 0 && d.daysUntil <= 30).length
  );

  overdueCount = computed(() => 
    this.deadlines().filter(d => d.daysUntil < 0).length
  );

  criticalCount = computed(() => 
    this.deadlines().filter(d => d.daysUntil >= 0 && d.daysUntil <= 7).length
  );

  constructor(
    private api: GovernanceApiService,
    private ksaApi: KsaRegulatoryApiService,
    public i18n: I18nService,
    ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    
    // Load regulatory deadlines from leadership digest or KSA intelligence
    this.api.getDigests().subscribe({
      next: (response) => {
        const digests = Array.isArray(response) ? response : (response as GrcRecord).digests || [];
        const latestDigest = digests[0];
        
        if (latestDigest?.enrichedContent?.ksaRegulatoryIntelligence?.regulatoryDeadlines) {
          const deadlines = latestDigest.enrichedContent.ksaRegulatoryIntelligence.regulatoryDeadlines.map((d) => ({
            regulatorCode: d.regulatorCode,
            frameworkCode: d.frameworkCode,
            deadlineType: d.deadlineType,
            dueDate: d.dueDate,
            descriptionEn: d.descriptionEn,
            descriptionAr: d.descriptionAr,
            severity: d.severity || 'medium',
            daysUntil: d.daysUntil || 0,
          }));
          this.deadlines.set(deadlines);
        }

        // Also load compliance summary
        this.ksaApi.getComplianceSummary().subscribe({
          next: (summaryResponse) => {
            if (summaryResponse.success) {
              this.complianceSummary.set(summaryResponse.data);
            }
          },
          error: (err) => {
            console.error('Failed to load compliance summary', err);
          },
        });

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load regulatory deadlines', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load regulatory calendar',
        });
        this.loading.set(false);
      },
    });
  }

  getSeverityClass(deadline: RegulatoryDeadline): string {
    if (deadline.daysUntil < 0) return 'danger';
    if (deadline.daysUntil <= 7) return 'danger';
    if (deadline.daysUntil <= 14) return 'warning';
    if (deadline.daysUntil <= 30) return 'info';
    return 'success';
  }

  getSeverityLabel(deadline: RegulatoryDeadline): string {
    if (deadline.daysUntil < 0) return 'Overdue';
    if (deadline.daysUntil <= 7) return 'Critical';
    if (deadline.daysUntil <= 14) return 'Urgent';
    if (deadline.daysUntil <= 30) return 'Upcoming';
    return 'Scheduled';
  }

  getRegulatorName(code: string): string {
    const map: Record<string, string> = {
      'REG-KSA-NCA': 'NCA',
      'REG-KSA-SAMA': 'SAMA',
      'REG-KSA-SDAIA': 'SDAIA',
      'REG-KSA-CST': 'CST',
      'REG-KSA-MOH': 'MOH',
    };
    return map[code] || code;
  }

  refresh(): void {
    this.load();
  }

  getDaysUntil(deadline: RegulatoryDeadline): number {
    return deadline.daysUntil;
  }

  getDaysOverdue(deadline: RegulatoryDeadline): number {
    return Math.abs(deadline.daysUntil);
  }
}
