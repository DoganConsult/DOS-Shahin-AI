// Shahin GRC — Local Knowledge Hub Component | R3.3B Phase F
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { LocalKnowledgeApiService, type LocalKnowledgeSource, type IngestionLogItem, type KnowledgeDocument, type PublishedKnowledge } from '../../core/services/workflow-collab/local-knowledge-api.service';

interface HubTab {
  key: string;
  labelEn: string;
  labelAr: string;
  icon: string;
}

const TABS: HubTab[] = [
  { key: 'sources', labelEn: 'Sources', labelAr: 'المصادر', icon: 'pi-folder' },
  { key: 'ingestions', labelEn: 'Ingestions', labelAr: 'الاستيراد', icon: 'pi-upload' },
  { key: 'documents', labelEn: 'Documents', labelAr: 'الوثائق', icon: 'pi-file' },
  { key: 'published', labelEn: 'Published', labelAr: 'المنشور', icon: 'pi-book' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-local-knowledge-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="local-knowledge-hub" [dir]="i18n.direction()">
      <div class="hub-tab-bar" role="tablist">
        @for (tab of tabs; track tab.key) {
          <button
            class="hub-tab"
            role="tab"
            [class.active]="activeTab() === tab.key"
            (click)="activeTab.set(tab.key)"
            [attr.aria-selected]="activeTab() === tab.key">
            <i class="pi" [ngClass]="tab.icon"></i>
            <span>{{ i18n.currentLang() === 'ar' ? tab.labelAr : tab.labelEn }}</span>
          </button>
        }
      </div>

      <div class="hub-tab-content">
        <!-- Sources Tab -->
        @if (activeTab() === 'sources') {
          <section class="tab-section">
            <header class="section-header">
              <h3>{{ i18n.currentLang() === 'ar' ? 'مصادر المعرفة المحلية' : 'Local Knowledge Sources' }}</h3>
              <button class="btn-primary" (click)="showAddSource = true">
                <i class="pi pi-plus"></i> {{ i18n.currentLang() === 'ar' ? 'إضافة مصدر' : 'Add Source' }}
              </button>
            </header>
            @if (sourcesLoading()) {
              <p class="text-muted">{{ i18n.currentLang() === 'ar' ? 'جاري التحميل...' : 'Loading...' }}</p>
            } @else if (sourcesError()) {
              <div class="alert alert-error">{{ sourcesError() }}</div>
            } @else {
              <div class="sources-grid">
                @for (source of sources(); track source.sourceId) {
                  <div class="source-card">
                    <div class="source-header">
                      <h4>{{ source.sourceName }}</h4>
                      <span class="badge" [class.badge-active]="source.status === 'active'" [class.badge-inactive]="source.status === 'inactive'">
                        {{ source.status }}
                      </span>
                    </div>
                    <p class="source-type">{{ source.sourceType }}</p>
                    @if (source.sourcePath) {
                      <p class="source-path">{{ source.sourcePath }}</p>
                    }
                    @if (source.lastSyncAt) {
                      <p class="text-muted text-sm">Last sync: {{ source.lastSyncAt | date:'short' }}</p>
                    }
                  </div>
                }
                @if (sources().length === 0) {
                  <p class="text-muted">{{ i18n.currentLang() === 'ar' ? 'لا توجد مصادر' : 'No sources configured' }}</p>
                }
              </div>
            }
          </section>
        }

        <!-- Ingestions Tab -->
        @if (activeTab() === 'ingestions') {
          <section class="tab-section">
            <header class="section-header">
              <h3>{{ i18n.currentLang() === 'ar' ? 'سجل الاستيراد' : 'Ingestion Log' }}</h3>
            </header>
            @if (ingestionsLoading()) {
              <p class="text-muted">{{ i18n.currentLang() === 'ar' ? 'جاري التحميل...' : 'Loading...' }}</p>
            } @else if (ingestionsError()) {
              <div class="alert alert-error">{{ ingestionsError() }}</div>
            } @else {
              <div class="ingestions-table">
                <table>
                  <thead>
                    <tr>
                      <th>{{ i18n.currentLang() === 'ar' ? 'المسار' : 'Path' }}</th>
                      <th>{{ i18n.currentLang() === 'ar' ? 'النوع' : 'Type' }}</th>
                      <th>{{ i18n.currentLang() === 'ar' ? 'الحالة' : 'Status' }}</th>
                      <th>{{ i18n.currentLang() === 'ar' ? 'التاريخ' : 'Date' }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of ingestions(); track item.ingestionId) {
                      <tr>
                        <td>{{ item.sourceObjectPath }}</td>
                        <td>{{ item.documentType || 'any' }}</td>
                        <td>
                          <span class="badge" [class.badge-completed]="item.status === 'completed'" [class.badge-failed]="item.status === 'failed'">
                            {{ item.status }}
                          </span>
                        </td>
                        <td>{{ item.ingestedAt | date:'short' }}</td>
                      </tr>
                    }
                    @if (ingestions().length === 0) {
                      <tr>
                        <td colspan="4" class="text-muted">{{ i18n.currentLang() === 'ar' ? 'لا توجد عمليات استيراد' : 'No ingestions yet' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }

        <!-- Documents Tab -->
        @if (activeTab() === 'documents') {
          <section class="tab-section">
            <header class="section-header">
              <h3>{{ i18n.currentLang() === 'ar' ? 'الوثائق المستوردة' : 'Imported Documents' }}</h3>
              <div class="search-box">
                <input
                  type="text"
                  [(ngModel)]="documentSearchQuery"
                  (input)="searchDocuments()"
                  [placeholder]="i18n.currentLang() === 'ar' ? 'بحث في الوثائق...' : 'Search documents...'"
                  class="search-input" />
              </div>
            </header>
            @if (documentsLoading()) {
              <p class="text-muted">{{ i18n.currentLang() === 'ar' ? 'جاري التحميل...' : 'Loading...' }}</p>
            } @else if (documentsError()) {
              <div class="alert alert-error">{{ documentsError() }}</div>
            } @else {
              <div class="documents-list">
                @for (doc of documents(); track doc.documentId) {
                  <div class="document-card">
                    <div class="document-header">
                      <h4>{{ doc.title || doc.documentType }}</h4>
                      <span class="badge badge-lane">{{ doc.knowledgeLane }}</span>
                    </div>
                    <p class="document-meta">
                      Type: {{ doc.documentType }} · Version: {{ doc.version }} · {{ doc.createdAt | date:'short' }}
                    </p>
                  </div>
                }
                @if (documents().length === 0) {
                  <p class="text-muted">{{ i18n.currentLang() === 'ar' ? 'لا توجد وثائق' : 'No documents found' }}</p>
                }
              </div>
            }
          </section>
        }

        <!-- Published Knowledge Tab -->
        @if (activeTab() === 'published') {
          <section class="tab-section">
            <header class="section-header">
              <h3>{{ i18n.currentLang() === 'ar' ? 'المعرفة المنشورة' : 'Published Knowledge' }}</h3>
              <div class="search-box">
                <input
                  type="text"
                  [(ngModel)]="publishedSearchQuery"
                  (input)="searchPublished()"
                  [placeholder]="i18n.currentLang() === 'ar' ? 'بحث في المعرفة...' : 'Search knowledge...'"
                  class="search-input" />
              </div>
            </header>
            @if (publishedLoading()) {
              <p class="text-muted">{{ i18n.currentLang() === 'ar' ? 'جاري التحميل...' : 'Loading...' }}</p>
            } @else if (publishedError()) {
              <div class="alert alert-error">{{ publishedError() }}</div>
            } @else {
              <div class="published-list">
                @for (item of published(); track item.publishedId) {
                  <div class="published-card">
                    <div class="published-header">
                      <h4>{{ item.title }}</h4>
                      <span class="badge" [class.badge-published]="item.status === 'published'">
                        {{ item.status }}
                      </span>
                    </div>
                    <p class="published-type">{{ item.knowledgeType }}</p>
                    @if (item.summary) {
                      <p class="published-summary">{{ item.summary }}</p>
                    }
                    @if (item.tags.length > 0) {
                      <div class="tags">
                        @for (tag of item.tags; track tag) {
                          <span class="tag">{{ tag }}</span>
                        }
                      </div>
                    }
                  </div>
                }
                @if (published().length === 0) {
                  <p class="text-muted">{{ i18n.currentLang() === 'ar' ? 'لا توجد معرفة منشورة' : 'No published knowledge' }}</p>
                }
              </div>
            }
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .local-knowledge-hub { min-height: 100vh; background: var(--surface-ground, #f5f5f5); }
    .hub-tab-bar { display: flex; gap: 4px; padding: 16px 28px 0; border-bottom: 1px solid var(--surface-border); flex-wrap: wrap; }
    .hub-tab { display: flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: var(--radius) 8px 0 0; border: none; background: transparent; font-size: var(--font-size-base); color: var(--text-color-secondary); cursor: pointer; transition: background 0.15s, color 0.15s; border-bottom: 2px solid transparent; }
    .hub-tab:hover { background: var(--surface-100); color: var(--text-color); }
    .hub-tab.active { color: var(--primary-700, #1d4ed8); border-bottom-color: var(--primary-500, #3b82f6); font-weight: 600; }
    .hub-tab-content { padding: 24px 28px; }
    .tab-section { background: white; border-radius: var(--radius); padding: 24px; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .section-header h3 { margin: 0; font-size: var(--font-size-lg); font-weight: 600; }
    .btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--primary-500, #3b82f6); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-base); }
    .btn-primary:hover { background: var(--primary-600, #2563eb); }
    .sources-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .source-card { padding: 16px; border: 1px solid var(--surface-border); border-radius: var(--radius); background: var(--surface-0); }
    .source-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .source-header h4 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .source-type { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin: 4px 0; }
    .source-path { font-size: var(--font-size-sm); color: var(--text-color-muted); font-family: monospace; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-lg); font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; }
    .badge-active { background: #dcfce7; color: #15803d; }
    .badge-inactive { background: #f3f4f6; color: #6b7280; }
    .badge-completed { background: #dbeafe; color: #1d4ed8; }
    .badge-failed { background: #fee2e2; color: #dc2626; }
    .badge-published { background: #dcfce7; color: #15803d; }
    .badge-lane { background: #fef3c7; color: #92400e; }
    .ingestions-table { overflow-x: auto; }
    .ingestions-table table { width: 100%; border-collapse: collapse; }
    .ingestions-table th, .ingestions-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--surface-border); }
    .ingestions-table th { font-weight: 600; font-size: var(--font-size-sm); text-transform: uppercase; color: var(--text-color-secondary); }
    .search-box { margin-left: auto; }
    .search-input { padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-base); width: 300px; }
    .documents-list, .published-list { display: flex; flex-direction: column; gap: 12px; }
    .document-card, .published-card { padding: 16px; border: 1px solid var(--surface-border); border-radius: var(--radius); background: var(--surface-0); }
    .document-header, .published-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .document-header h4, .published-header h4 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .document-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin: 4px 0; }
    .published-type { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin: 4px 0; }
    .published-summary { font-size: var(--font-size-base); color: var(--text-color); margin: 8px 0; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .tag { display: inline-block; padding: 4px 8px; background: var(--surface-100); border-radius: var(--radius-xs); font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .alert { padding: 12px; border-radius: var(--radius-sm); margin: 12px 0; }
    .alert-error { background: #fee2e2; color: #dc2626; }
    .text-muted { color: var(--text-color-secondary); }
    .text-sm { font-size: var(--font-size-sm); }
  `],
})
export class LocalKnowledgeHubComponent implements OnInit {
  i18n = inject(I18nService);
  api = inject(LocalKnowledgeApiService);

  tabs = TABS;
  activeTab = signal<string>('sources');
  showAddSource = false;

  // Sources
  sources = signal<LocalKnowledgeSource[]>([]);
  sourcesLoading = signal(false);
  sourcesError = signal<string | null>(null);

  // Ingestions
  ingestions = signal<IngestionLogItem[]>([]);
  ingestionsLoading = signal(false);
  ingestionsError = signal<string | null>(null);

  // Documents
  documents = signal<KnowledgeDocument[]>([]);
  documentsLoading = signal(false);
  documentsError = signal<string | null>(null);
  documentSearchQuery = '';

  // Published
  published = signal<PublishedKnowledge[]>([]);
  publishedLoading = signal(false);
  publishedError = signal<string | null>(null);
  publishedSearchQuery = '';

  ngOnInit(): void {
    this.loadSources();
    this.loadIngestions();
    this.loadDocuments();
    this.loadPublished();
  }

  loadSources(): void {
    this.sourcesLoading.set(true);
    this.sourcesError.set(null);
    this.api.listSources().subscribe({
      next: (data) => {
        this.sources.set(Array.isArray(data) ? data : data.items);
        this.sourcesLoading.set(false);
      },
      error: (err) => {
        this.sourcesError.set(err.message || 'Failed to load sources');
        this.sourcesLoading.set(false);
      },
    });
  }

  loadIngestions(): void {
    this.ingestionsLoading.set(true);
    this.ingestionsError.set(null);
    this.api.listIngestions({ limit: 50 }).subscribe({
      next: (data) => {
        this.ingestions.set(data.items);
        this.ingestionsLoading.set(false);
      },
      error: (err) => {
        this.ingestionsError.set(err.message || 'Failed to load ingestions');
        this.ingestionsLoading.set(false);
      },
    });
  }

  loadDocuments(): void {
    this.documentsLoading.set(true);
    this.documentsError.set(null);
    this.api.listDocuments({ limit: 50 }).subscribe({
      next: (data) => {
        this.documents.set(data.items);
        this.documentsLoading.set(false);
      },
      error: (err) => {
        this.documentsError.set(err.message || 'Failed to load documents');
        this.documentsLoading.set(false);
      },
    });
  }

  searchDocuments(): void {
    if (!this.documentSearchQuery.trim()) {
      this.loadDocuments();
      return;
    }
    this.documentsLoading.set(true);
    this.documentsError.set(null);
    this.api.searchDocuments(this.documentSearchQuery).subscribe({
      next: (data) => {
        this.documents.set(data);
        this.documentsLoading.set(false);
      },
      error: (err) => {
        this.documentsError.set(err.message || 'Search failed');
        this.documentsLoading.set(false);
      },
    });
  }

  loadPublished(): void {
    this.publishedLoading.set(true);
    this.publishedError.set(null);
    this.api.listPublishedKnowledge({ status: 'published' }).subscribe({
      next: (data) => {
        this.published.set(data.items);
        this.publishedLoading.set(false);
      },
      error: (err) => {
        this.publishedError.set(err.message || 'Failed to load published knowledge');
        this.publishedLoading.set(false);
      },
    });
  }

  searchPublished(): void {
    if (!this.publishedSearchQuery.trim()) {
      this.loadPublished();
      return;
    }
    this.publishedLoading.set(true);
    this.publishedError.set(null);
    this.api.searchPublishedKnowledge(this.publishedSearchQuery).subscribe({
      next: (data) => {
        this.published.set(data);
        this.publishedLoading.set(false);
      },
      error: (err) => {
        this.publishedError.set(err.message || 'Search failed');
        this.publishedLoading.set(false);
      },
    });
  }
}
