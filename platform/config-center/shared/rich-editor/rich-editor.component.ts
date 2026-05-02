import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild,
  AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';

type EditorType = 'quill' | 'ngx-quill' | 'prosemirror';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean'],
  ],
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rich-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  template: `
    <div class="rich-editor-container">
      <quill-editor
        *ngIf="type === 'ngx-quill'"
        [(ngModel)]="content"
        [modules]="quillModules"
        [readOnly]="readonly"
        [style]="{'min-height': minHeight}"
        [placeholder]="placeholder"
        theme="snow"
        (onContentChanged)="onNgxQuillChange($event)"
      ></quill-editor>
      <div *ngIf="type !== 'ngx-quill'" #editorEl class="editor-canvas" [style.min-height]="minHeight"></div>
    </div>
  `,
  styles: [`
    .rich-editor-container { border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: hidden; }
    .editor-canvas { padding: 12px; }
    .ql-toolbar { border-bottom: 1px solid var(--surface-border, #e0e0e0); }
    .ql-container { border: none; }
    .ProseMirror { outline: none; min-height: 200px; }
  `],
})
export class RichEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('editorEl') editorEl?: ElementRef<HTMLDivElement>;
  @Input() content = '';
  @Input() minHeight = '200px';
  @Input() type: EditorType = 'ngx-quill';
  @Input() readonly = false;
  @Input() placeholder = '';
  @Output() contentChange = new EventEmitter<string>();

  quillModules = QUILL_MODULES;
  private editor: any = null;
  private prosemirrorView: any = null;

  async ngAfterViewInit(): Promise<void> {
    if (this.type === 'prosemirror') {
      await this.initProseMirror();
    } else if (this.type === 'quill') {
      await this.initQuill();
    }
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['content'] && !changes['content'].firstChange) {
      this.setContent(this.content);
    }
  }

  ngOnDestroy(): void {
    this.prosemirrorView?.destroy();
  }

  onNgxQuillChange(event: any): void {
    this.contentChange.emit(event.html || '');
  }

  private async initQuill(): Promise<void> {
    if (!this.editorEl?.nativeElement) return;
    try {
      const Quill = (await import('quill')).default;
      this.editor = new Quill(this.editorEl.nativeElement, {
        theme: 'snow',
        readOnly: this.readonly,
        modules: {
          toolbar: this.readonly ? false : QUILL_MODULES.toolbar,
        },
      });

      if (this.content) {
        this.editor.root.innerHTML = this.content;
      }

      this.editor.on('text-change', () => {
        this.contentChange.emit(this.editor.root.innerHTML);
      });
    } catch (err) {
      console.error('[RichEditor] Quill init failed:', err);
    }
  }

  private async initProseMirror(): Promise<void> {
    if (!this.editorEl?.nativeElement) return;
    try {
      const { EditorState } = await import('prosemirror-state');
      const { EditorView } = await import('prosemirror-view');
      const { schema } = await import('prosemirror-schema-basic');
      const { addListNodes } = await import('prosemirror-schema-list');
      const { Schema, DOMParser } = await import('prosemirror-model');
      const { history } = await import('prosemirror-history');
      const { keymap } = await import('prosemirror-keymap');
      const { baseKeymap } = await import('prosemirror-commands');

      const mySchema = new Schema({
        nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
        marks: schema.spec.marks,
      });

      const doc = this.content
        ? DOMParser.fromSchema(mySchema).parse(new window.DOMParser().parseFromString(this.content, 'text/html').body)
        : mySchema.topNodeType.createAndFill()!;

      const state = EditorState.create({
        doc,
        plugins: [
          history(),
          keymap(baseKeymap),
        ],
      });

      this.prosemirrorView = new EditorView(this.editorEl.nativeElement, {
        state,
        editable: () => !this.readonly,
        dispatchTransaction: (transaction) => {
          const newState = this.prosemirrorView!.state.apply(transaction);
          this.prosemirrorView!.updateState(newState);
          if (transaction.docChanged) {
            this.contentChange.emit(this.editorEl!.nativeElement.innerHTML);
          }
        },
      });
    } catch (err) {
      console.error('[RichEditor] ProseMirror init failed:', err);
    }
  }

  setContent(html: string): void {
    if (this.type === 'quill' && this.editor) {
      this.editor.root.innerHTML = html;
    }
  }

  getContent(): string {
    if (this.type === 'quill' && this.editor) {
      return this.editor.root.innerHTML;
    }
    if (this.type === 'prosemirror' && this.prosemirrorView) {
      return this.editorEl!.nativeElement.innerHTML;
    }
    return '';
  }
}
