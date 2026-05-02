/**
 * Board Decision Register Component
 *
 * Full-page board decision management with filtering, decision cards,
 * create dialog, detail view with linked entities, follow-up actions,
 * and vote record summary.
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcFormFieldComponent } from '@app/widgets';

interface BoardDecision {
  decisionId: string;
  titleEn: string;
  titleAr?: string;
  committeeName?: string;
  decisionType: string;
  decisionDate: string;
  status: string;
  priority?: string;
  riskImpact?: string;
  linkedEntityCount?: number;
  approvers: GrcRecord[];
}

interface DecisionDetail {
  decisionId: string;
  titleEn: string;
  titleAr?: string;
  committeeName?: string;
  decisionType: string;
  decisionDate: string;
  status: string;
  priority?: string;
  rationaleEn?: string;
  rationaleAr?: string;
  linkedEntities: LinkedEntity[];
  actions: FollowUpAction[];
  votes: VoteRecord[];
}

interface LinkedEntity {
  entityId: string;
  entityType: 'risk' | 'control' | 'policy' | 'exception' | 'obligation';
  titleEn: string;
  status: string;
}

interface FollowUpAction {
  actionId: string;
  titleEn: string;
  assignee: string;
  dueDate: string;
  status: string;
}

interface VoteRecord {
  voterName: string;
  vote: 'approve' | 'reject' | 'abstain';
  comment?: string;
}

@Component({
    selector: 'app-board-decisions',
    imports: [CommonModule, FormsModule, GrcFormFieldComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './board-decisions.component.html',
    styleUrls: ['./board-decisions.component.scss']
})
export class BoardDecisionsComponent implements OnInit {
  private http = inject(HttpClient);

  decisions = signal<BoardDecision[]>([]);
  detail = signal<DecisionDetail | null>(null);
  typeFilter = '';
  statusFilter = '';
  dateFrom = '';
  dateTo = '';
  showCreate = false;
  newDecision: GrcRecord = {
    titleEn: '', titleAr: '', decisionType: 'general',
    committeeName: '', priority: 'medium', rationaleEn: '',
  };

  /** Entity linking state */
  newLinkEntityId = '';
  newLinkEntityType = 'risk';

  /** Follow-up action state */
  newActionTitle = '';
  newActionAssignee = '';

  /** Computed: group linked entities by type */
  entityGroups = computed(() => {
    const d = this.detail();
    if (!d) return [];
    const groups: Record<string, LinkedEntity[]> = {};
    for (const ent of d.linkedEntities) {
      if (!groups[ent.entityType]) groups[ent.entityType] = [];
      groups[ent.entityType].push(ent);
    }
    return Object.entries(groups).map(([type, entities]) => ({ type, entities }));
  });

  ngOnInit(): void { this.load(); }

  /** Load decisions list */
  load(): void {
    const params: Record<string, string> = {};
    if (this.typeFilter) params['type'] = this.typeFilter;
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.dateFrom) params['dateFrom'] = this.dateFrom;
    if (this.dateTo) params['dateTo'] = this.dateTo;

    this.http.get<{ decisions: BoardDecision[] }>('/api/board-decisions', { params }).subscribe({
      next: (res) => this.decisions.set(res.decisions || []),
      error: () => this.decisions.set([]),
    });
  }

  /** Create a new decision */
  create(): void {
    this.http.post('/api/board-decisions', this.newDecision).subscribe({
      next: () => {
        this.showCreate = false;
        this.load();
        this.newDecision = {
          titleEn: '', titleAr: '', decisionType: 'general',
          committeeName: '', priority: 'medium', rationaleEn: '',
        };
      },
      error: (err) => alert(err.error?.error || 'Failed to create'),
    });
  }

  /** View decision detail */
  viewDetail(decisionId: string): void {
    this.http.get<DecisionDetail>(`/api/board-decisions/${decisionId}`).subscribe({
      next: (res) => this.detail.set(res),
      error: () => this.detail.set(null),
    });
  }

  /** Add linked entity to current decision */
  addLink(): void {
    const d = this.detail();
    if (!d || !this.newLinkEntityId) return;
    this.http.post(`/api/board-decisions/${d.decisionId}/links`, {
      entityId: this.newLinkEntityId,
      entityType: this.newLinkEntityType,
    }).subscribe({
      next: () => {
        this.newLinkEntityId = '';
        this.viewDetail(d.decisionId);
      },
    });
  }

  /** Add follow-up action to current decision */
  addAction(): void {
    const d = this.detail();
    if (!d || !this.newActionTitle) return;
    this.http.post(`/api/board-decisions/${d.decisionId}/actions`, {
      titleEn: this.newActionTitle,
      assignee: this.newActionAssignee,
    }).subscribe({
      next: () => {
        this.newActionTitle = '';
        this.newActionAssignee = '';
        this.viewDetail(d.decisionId);
      },
    });
  }

  /** Count votes by type */
  voteCount(type: string): number {
    return this.detail()?.votes.filter(v => v.vote === type).length ?? 0;
  }

  /** Format decision type for display */
  formatType(type: string): string {
    return type.replace(/_/g, ' ');
  }
}
