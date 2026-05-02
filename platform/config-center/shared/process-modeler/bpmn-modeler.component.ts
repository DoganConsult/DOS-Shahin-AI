import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild,
  AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bpmn-modeler',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bpmn-container" [style.height]="height">
      <div #canvas class="bpmn-canvas"></div>
    </div>
  `,
  styles: [`
    .bpmn-container { position: relative; width: 100%; border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: hidden; }
    .bpmn-canvas { width: 100%; height: 100%; }
  `],
})
export class BpmnModelerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLDivElement>;
  @Input() xml = '';
  @Input() height = '500px';
  @Input() readonly = false;
  @Output() xmlChange = new EventEmitter<string>();
  @Output() elementSelected = new EventEmitter<any>();

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
        const BpmnViewer = (await import('bpmn-js')).default;
        this.modeler = new BpmnViewer({ container: this.canvas.nativeElement });
      } else {
        const BpmnModeler = (await import('bpmn-js/lib/Modeler')).default;
        this.modeler = new BpmnModeler({ container: this.canvas.nativeElement });
      }

      this.modeler.on('element.click', (event: any) => {
        this.elementSelected.emit(event.element);
      });

      if (this.xml) await this.importXml(this.xml);
    } catch (err) {
      console.error('[BpmnModeler] Init failed:', err);
    }
  }

  private async importXml(xml: string): Promise<void> {
    if (!this.modeler || !xml) return;
    try {
      await this.modeler.importXML(xml);
      const canvas = this.modeler.get('canvas');
      canvas.zoom('fit-viewport');
    } catch (err) {
      console.error('[BpmnModeler] Import failed:', err);
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

  async getSvg(): Promise<string> {
    if (!this.modeler) return '';
    try {
      const { svg } = await this.modeler.saveSVG();
      return svg;
    } catch {
      return '';
    }
  }
}
