import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutWidgetInput } from '../../../../../core/dashboard/dashboard-editor.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dashboard-layout-canvas',
    imports: [CommonModule],
    template: `
    <div class="border rounded-2xl bg-white p-4 space-y-3">
      <div class="font-semibold">Layout</div>

      <div class="space-y-3">
        <div
          *ngFor="let widget of widgets; let i = index"
          class="border rounded-xl p-3 space-y-2"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">{{ widget.widgetKey }}</div>
              <div class="text-xs text-gray-500">
                x={{ widget.x }} y={{ widget.y }} w={{ widget.w }} h={{ widget.h }}
              </div>
            </div>

            <div class="flex gap-2">
              <button type="button" class="border rounded px-2 py-1 text-xs" (click)="moveUp(i)">↑</button>
              <button type="button" class="border rounded px-2 py-1 text-xs" (click)="moveDown(i)">↓</button>
              <button type="button" class="border rounded px-2 py-1 text-xs" (click)="widen(i)">W+</button>
              <button type="button" class="border rounded px-2 py-1 text-xs" (click)="narrow(i)">W-</button>
              <button type="button" class="border rounded px-2 py-1 text-xs" (click)="remove(i)">Remove</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardLayoutCanvasComponent {
  @Input() widgets: DashboardLayoutWidgetInput[] = [];
  @Output() widgetsChange = new EventEmitter<DashboardLayoutWidgetInput[]>();

  private emit(next: DashboardLayoutWidgetInput[]) {
    this.widgetsChange.emit(next.map((x, idx) => ({ ...x, y: idx * 3 })));
  }

  moveUp(index: number) {
    if (index <= 0) return;
    const next = [...this.widgets];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    this.emit(next);
  }

  moveDown(index: number) {
    if (index >= this.widgets.length - 1) return;
    const next = [...this.widgets];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    this.emit(next);
  }

  widen(index: number) {
    const next = [...this.widgets];
    next[index] = { ...next[index], w: Math.min(12, next[index].w + 1) };
    this.emit(next);
  }

  narrow(index: number) {
    const next = [...this.widgets];
    next[index] = { ...next[index], w: Math.max(1, next[index].w - 1) };
    this.emit(next);
  }

  remove(index: number) {
    const next = this.widgets.filter((_, i) => i !== index);
    this.emit(next);
  }

}
