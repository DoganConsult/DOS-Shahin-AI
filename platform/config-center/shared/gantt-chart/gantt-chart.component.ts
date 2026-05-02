import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild,
  AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  duration: number;
  progress?: number;
  parent?: string;
  type?: string;
  color?: string;
}

export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-gantt-chart',
    imports: [CommonModule],
    template: `<div #ganttContainer class="gantt-container" [style.height]="height"></div>`,
    styles: [`
    .gantt-container { width: 100%; border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: hidden; }
  `]
})
export class GanttChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('ganttContainer', { static: true }) container!: ElementRef<HTMLDivElement>;
  @Input() tasks: GanttTask[] = [];
  @Input() links: GanttLink[] = [];
  @Input() height = '500px';
  @Input() readonly = false;
  @Output() taskSelected = new EventEmitter<GanttTask>();
  @Output() taskUpdated = new EventEmitter<GanttTask>();

  private gantt: any = null;

  async ngAfterViewInit(): Promise<void> {
    await this.initGantt();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if ((changes['tasks'] || changes['links']) && this.gantt) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.gantt?.destructor();
  }

  private async initGantt(): Promise<void> {
    try {
      const ganttModule = await import('dhtmlx-gantt');
      this.gantt = ganttModule.gantt;

      this.gantt.config.date_format = '%Y-%m-%d %H:%i';
      this.gantt.config.readonly = this.readonly;
      this.gantt.config.fit_tasks = true;
      this.gantt.config.autofit = true;

      this.gantt.init(this.container.nativeElement);
      this.loadData();

      this.gantt.attachEvent('onTaskClick', (id: string) => {
        const task = this.gantt.getTask(id);
        this.taskSelected.emit(task);
        return true;
      });

      this.gantt.attachEvent('onAfterTaskUpdate', (id: string) => {
        const task = this.gantt.getTask(id);
        this.taskUpdated.emit(task);
      });
    } catch (err) {
      console.error('[GanttChart] Init failed:', err);
    }
  }

  private loadData(): void {
    if (!this.gantt) return;
    this.gantt.clearAll();
    this.gantt.parse({ data: this.tasks, links: this.links });
  }
}
