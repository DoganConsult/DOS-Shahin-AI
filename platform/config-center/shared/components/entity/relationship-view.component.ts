import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AccordionModule } from 'primeng/accordion';
import { SkeletonModule } from 'primeng/skeleton';
import { environment } from '@env/environment';

interface RelatedObject {
  mapping_id: string;
  type: string;
  id: string;
  created_at: string;
}

interface GroupedRelationships {
  type: string;
  items: RelatedObject[];
}

const ROUTE_MAP: Record<string, string> = {
  risk: '/risk/register',
  policy: '/policies',
  control: '/controls',
  framework: '/frameworks',
  evidence: '/evidence',
  incident: '/incidents',
  vendor: '/vendors',
  exception: '/exceptions',
  finding: '/findings',
  asset: '/assets',
  assessment: '/audit',
  workspace: '/workspace-home',
  remediation_task: '/workflows',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-relationship-view',
  standalone: true,
  imports: [CommonModule, RouterLink, AccordionModule, SkeletonModule],
  template: `
    <div class="relationship-panel" *ngIf="objectType && objectId">
      <h3 class="panel-title"><i class="pi pi-sitemap"></i> Related Objects</h3>

      <p-skeleton *ngIf="loading" width="100%" height="80px" />

      <ng-container *ngIf="!loading">
        <div *ngIf="groups.length === 0" class="empty-text">No relationships found</div>

        <p-accordion *ngIf="groups.length > 0" [multiple]="true">
          <p-accordionTab *ngFor="let group of groups"
            [header]="formatTypeName(group.type) + ' (' + group.items.length + ')'"
            [selected]="true">
            <ul class="rel-list">
              <li *ngFor="let item of group.items" class="rel-item">
                <a [routerLink]="getRoute(item.type)" class="rel-link">
                  <i class="pi" [ngClass]="getIcon(item.type)"></i>
                  <span class="rel-type">{{ formatTypeName(item.type) }}</span>
                  <span class="rel-id">#{{ item.id | slice:0:8 }}</span>
                </a>
              </li>
            </ul>
          </p-accordionTab>
        </p-accordion>
      </ng-container>
    </div>
  `,
  styles: [`
    .relationship-panel {
      background: var(--surface-card, var(--text-heading));
      border-radius: var(--radius);
      padding: 16px;
      border: 1px solid var(--surface-border, #334155);
    }
    .panel-title {
      font-size: var(--font-size-base); font-weight: 600; color: var(--text, var(--border-subtle));
      margin: 0 0 12px; display: flex; align-items: center; gap: 8px;
    }
    .panel-title .pi { color: #60a5fa; }
    .empty-text { font-size: var(--font-size-sm); color: #475569; }
    .rel-list { list-style: none; padding: 0; margin: 0; }
    .rel-item { padding: 4px 0; }
    .rel-link {
      display: flex; align-items: center; gap: 8px;
      text-decoration: none; color: var(--border-subtle); font-size: var(--font-size-sm);
      padding: 6px 8px; border-radius: var(--radius-sm);
      transition: background 150ms;
    }
    .rel-link:hover { background: rgba(var(--module-accent-blue-rgb), 0.1); }
    .rel-link .pi { font-size: var(--font-size-base); color: #60a5fa; }
    .rel-type { font-weight: 500; }
    .rel-id { color: var(--text-muted); }
  `],
})
export class RelationshipViewComponent implements OnChanges {
  @Input() objectType: string = '';
  @Input() objectId: string = '';

  groups: GroupedRelationships[] = [];
  loading = false;

  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['objectType'] || changes['objectId']) {
      if (this.objectType && this.objectId) {
        this.loadRelationships();
      }
    }
  }

  getRoute(type: string): string[] {
    return [ROUTE_MAP[type] || '/workspace-home'];
  }

  getIcon(type: string): string {
    const iconMap: Record<string, string> = {
      risk: 'pi-exclamation-triangle',
      policy: 'pi-file',
      control: 'pi-lock',
      framework: 'pi-sitemap',
      evidence: 'pi-folder',
      incident: 'pi-bolt',
      vendor: 'pi-truck',
      exception: 'pi-ban',
      finding: 'pi-search',
      asset: 'pi-server',
      assessment: 'pi-clipboard',
      remediation_task: 'pi-wrench',
    };
    return iconMap[type] || 'pi-circle';
  }

  formatTypeName(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private loadRelationships(): void {
    this.loading = true;
    this.http
      .get<{ relationships: Record<string, RelatedObject[]> }>(
        `${this.api}/objects/${this.objectType}/${this.objectId}/relationships`
      )
      .subscribe({
        next: (res) => {
          const relationships = res.relationships || {};
          this.groups = Object.entries(relationships).map(
            ([type, items]) => ({ type, items })
          );
          this.loading = false;
        },
        error: () => {
          this.groups = [];
          this.loading = false;
        },
      });
  }

}
