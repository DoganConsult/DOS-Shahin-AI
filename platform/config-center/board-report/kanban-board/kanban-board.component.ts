import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, ButtonModule, DialogModule, InputTextModule, InputTextarea],
  template: `
    <app-page-shell icon="th-large" [title]="i18n.translate('taskBoard.title')" [subtitle]="'Kanban task management'" [breadcrumbs]="['Dashboard', 'Task Board']" [loading]="loading">
      <div class="flex gap-3 mb-3">
        <button pButton [label]="i18n.translate('taskBoard.createTask')" icon="pi pi-plus" (click)="showCreate = true"></button>
      </div>
      <div class="grid">
        <div *ngFor="let col of columns" class="col-3">
          <div class="surface-card border-round p-3" style="min-height: 400px">
            <h4 class="mt-0 mb-3">{{i18n.translate('taskBoard.' + col.key)}} <span class="p-tag p-tag-rounded">{{board[col.key]?.length || 0}}</span></h4>
            <div *ngFor="let task of board[col.key] || []" class="surface-hover border-round p-3 mb-2 cursor-pointer" [style.border-inline-start]="'4px solid ' + getUrgencyColor(task.urgency)">
              <div class="font-semibold text-sm">{{task.title}}</div>
              <div class="text-xs text-color-secondary mt-1" *ngIf="task.dueDate"><i class="pi pi-calendar mr-1"></i>{{task.dueDate | appDate:'medium'}}</div>
              <div class="text-xs text-color-secondary" *ngIf="task.assignedTo"><i class="pi pi-user mr-1"></i>{{task.assignedTo}}</div>
            </div>
          </div>
        </div>
      </div>

      <p-dialog [header]="i18n.translate('taskBoard.createTask')" [(visible)]="showCreate" [modal]="true" [style]="{width: '450px'}">
        <div class="flex flex-column gap-3">
          <input pInputText [(ngModel)]="newTask.title" placeholder="Task title" aria-label="Task title" class="w-full" />
          <textarea pInputTextarea [(ngModel)]="newTask.description" placeholder="Description" aria-label="Description" rows="3" class="w-full"></textarea>
          <input pInputText [(ngModel)]="newTask.assignedTo" placeholder="Assigned to" aria-label="Assigned to" class="w-full" />
          <input pInputText type="date" [(ngModel)]="newTask.dueDate" class="w-full" />
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text" (click)="showCreate = false"></button>
          <button pButton label="Create" (click)="createTask()"></button>
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `
})
export class KanbanBoardComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  board: Record<string, Record<string, unknown>[]> = { todo: [], in_progress: [], review: [], done: [] };
  loading = true;
  showCreate = false;
  newTask = { title: '', description: '', assignedTo: '', dueDate: '' };
  columns = [
    { key: 'todo', label: 'To Do' }, { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Review' }, { key: 'done', label: 'Done' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.loadBoard(); }

  loadBoard() {
    this.loading = true;
    this.apiclientSvc.get('/task-board').subscribe({
      next: (data: any) => { this.board = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  createTask() {
    if (!this.newTask.title) return;
    this.apiclientSvc.post('/task-board/tasks', this.newTask).subscribe({
      next: () => { this.showCreate = false; this.newTask = { title: '', description: '', assignedTo: '', dueDate: '' }; this.loadBoard(); }
    });
  }

  getUrgencyColor(urgency: string): string {
    return urgency === 'green' ? 'var(--success)' : urgency === 'yellow' ? 'var(--warning)' : urgency === 'red' ? 'var(--error)' : 'var(--error)';
  }

}
