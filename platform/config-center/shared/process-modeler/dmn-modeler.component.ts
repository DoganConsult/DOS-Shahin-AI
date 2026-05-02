import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild,
  AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dmn-modeler',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dmn-container" [style.height]="height">
      <div #canvas class="dmn-canvas"></div>
    </div>
  `,
  styles: [`
    .dmn-container { position: relative; width: 100%; border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: hidden; }
    .dmn-canvas { width: 100%; height: 100%; }
  `],
})
export class DmnModelerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLDivElement>;
  @Input() xml = '';
  @Input() height = '500px';
  @Input() readonly = false;
  @Output() xmlChange = new EventEmitter<string>();

  private modeler: any = null;

  async ngAfterViewInit(): Promise<void> {
    await this.initModeler();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['xml'] && !changes['xml'].firstChange && this.modeler) {
      await this.importXml(this.xml);
    }
  }

  ngOnDestroy(): void {
    this.modeler?.destroy();
  }

  private async initModeler(): Promise<void> {
    try {
      if (this.readonly) {
        const DmnViewer = (await import('dmn-js')).default;
        this.modeler = new DmnViewer({ container: this.canvas.nativeElement });
      } else {
        const DmnModeler = (await import('dmn-js/lib/Modeler')).default;
        this.modeler = new DmnModeler({ container: this.canvas.nativeElement });
      }

      if (this.xml) await this.importXml(this.xml);
    } catch (err) {
      console.error('[DmnModeler] Init failed:', err);
    }
  }

  private async importXml(xml: string): Promise<void> {
    if (!this.modeler || !xml) return;
    try {
      await this.modeler.importXML(xml);
    } catch (err) {
      console.error('[DmnModeler] Import failed:', err);
    }
  }

  async getXml(): Promise<string> {
    if (!this.modeler) return '';
    try {
      const { xml } = await this.modeler.saveXML({ format: true });
      this.xmlChange.emit(xml);
      return xml;
    } catch {
      return '';
    }
  }
}
