import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KnowledgeApiService, type KnowledgeArticleDto } from '@app/core/services/api-clients/ai/knowledge-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-knowledge-base-page',
  standalone: true,
  imports: [NgFor, FormsModule],
  template: `
    <div class="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)] p-4">
      <header class="mb-4">
        <h1 class="text-xl font-semibold">Knowledge Base</h1>
        <p class="text-sm text-[var(--text-1)]">Search articles by text and tags.</p>
      </header>
      <div class="flex flex-wrap gap-4 mb-4">
        <input type="text" [(ngModel)]="query" (input)="onSearch()" placeholder="Search..." aria-label="Search..."
          class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] px-3 py-2 w-64 text-[var(--text-0)]" />
        <button type="button" (click)="onSearch()" class="px-4 py-2 rounded-xl bg-[var(--primary)] text-white">Search</button>
      </div>
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] overflow-hidden">
        @for (a of articles(); track a.id) {
          <div class="p-4 border-b border-[var(--border)] last:border-b-0">
            <h3 class="font-medium">{{ a.title }}</h3>
            <p class="text-sm text-[var(--text-1)] mt-1 line-clamp-2">{{ a.bodyMd }}</p>
            @if (a.tags?.length) {
              <div class="flex flex-wrap gap-1 mt-2">
                @for (t of a.tags; track t) {
                  <span class="text-xs px-2 py-0.5 rounded bg-[var(--bg-2)]">{{ t }}</span>
                }
              </div>
            }
          </div>
        } @empty {
          <div class="p-8 text-center text-[var(--text-1)]">No articles found.</div>
        }
      </div>
    </div>
  `,
})
export class KnowledgeBasePageComponent {
  private readonly api = inject(KnowledgeApiService);

  query = '';
  articles = signal<KnowledgeArticleDto[]>([]);

  constructor() {
    this.onSearch();
  }

  onSearch(): void {
    this.api.search(this.query || undefined).subscribe({
      next: (r) => this.articles.set(r.articles ?? []),
      error: () => this.articles.set([]),
    });
  }
}
