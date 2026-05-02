import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild,
  AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="form-builder-container" [style.height]="height">
      <div #formContainer class="form-canvas"></div>
    </div>
  `,
  styles: [`
    .form-builder-container { position: relative; width: 100%; border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: hidden; }
    .form-canvas { width: 100%; height: 100%; }
  `],
})
export class FormBuilderComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('formContainer', { static: true }) formContainer!: ElementRef<HTMLDivElement>;
  @Input() schema: any = {};
  @Input() height = '400px';
  @Input() readonly = false;
  @Output() schemaChange = new EventEmitter<any>();
  @Output() formSubmit = new EventEmitter<any>();

  private formInstance: any = null;

  async ngAfterViewInit(): Promise<void> {
    await this.initForm();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['schema'] && !changes['schema'].firstChange && this.formInstance) {
      await this.initForm();
    }
  }

  ngOnDestroy(): void {
    this.formInstance?.destroy();
  }

  private async initForm(): Promise<void> {
    try {
      this.formInstance?.destroy();
      const container = this.formContainer.nativeElement;
      container.innerHTML = '';

      if (this.readonly) {
        const { Form } = await import('@bpmn-io/form-js');
        this.formInstance = new Form({ container });
      } else {
        const { FormEditor } = await import('@bpmn-io/form-js');
        this.formInstance = new FormEditor({ container });
      }

      if (this.schema && Object.keys(this.schema).length > 0) {
        await this.formInstance.importSchema(this.schema);
      }

      if (!this.readonly) {
        this.formInstance.on('changed', () => {
          this.formInstance.saveSchema().then((schema: any) => {
            this.schemaChange.emit(schema);
          });
        });
      }

      this.formInstance.on('submit', (event: any) => {
        this.formSubmit.emit(event.data);
      });
    } catch (err) {
      console.error('[FormBuilder] Init failed:', err);
    }
  }

  async getSchema(): Promise<any> {
    if (!this.formInstance) return {};
    try {
      return await this.formInstance.saveSchema();
    } catch {
      return {};
    }
  }
}
