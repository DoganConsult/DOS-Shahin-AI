import { Component, inject, signal, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgFor } from '@angular/common';
import { PlaybooksApiService, type PlaybookDto } from '../services/playbooks-api.service';
import { devError } from '../../../core/utils/dev-logger';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-playbooks-hub-page',
    imports: [NgFor],
    template: `
    <div class="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)] p-4">
      <header class="mb-4">
        <h1 class="text-xl font-semibold">Playbooks</h1>
        <p class="text-sm text-[var(--text-1)]">KSA-ready playbook templates. Start a playbook to run its workflow.</p>
      </header>
      <div class="flex flex-wrap gap-4">
        <div *ngFor="let p of playbooks()" class="w-72 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-4">
          <h3 class="font-medium">{{ p.title }}</h3>
          <p class="text-xs text-[var(--text-1)] mt-1">{{ p.category }} · {{ p.severity ?? '—' }}</p>
          <button type="button" (click)="start(p)" class="mt-3 px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-sm">
            Start
          </button>
        </div>
      </div>
    </div>
  `
})
export class PlaybooksHubPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PlaybooksApiService);

  workspaceId = signal('');
  playbooks = signal<PlaybookDto[]>([]);

  ngOnInit(): void {
    const wid = this.route.snapshot.params['workspaceId'];
    this.workspaceId.set(wid ?? '');
    this.api.list(this.workspaceId() || undefined).subscribe({
      next: (list) => this.playbooks.set(list),
      error: () => this.playbooks.set([]),
    });
  }

  start(p: PlaybookDto): void {
    this.api.start(p.id, undefined, this.workspaceId() || undefined).subscribe({
      next: () => this.router.navigate(['/workflow', 'inbox']),
      error: (err) => devError(err),
    });
  }
}
