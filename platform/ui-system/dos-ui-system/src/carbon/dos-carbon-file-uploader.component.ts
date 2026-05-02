import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploaderModule } from 'carbon-components-angular';

/**
 * Carbon-backed file uploader (single + multi). Accepts a list of
 * already-uploaded files via [files] and emits added/removed events.
 */
@Component({
  selector: 'dos-carbon-file-uploader',
  standalone: true,
  imports: [CommonModule, FileUploaderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-file-uploader
      [title]="title"
      [description]="description"
      [size]="size"
      [buttonText]="buttonText"
      [accept]="accept"
      [multiple]="multiple"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [files]="files"
      (filesChange)="filesChange.emit($event)"
    ></cds-file-uploader>
  `,
})
export class DosCarbonFileUploaderComponent {
  @Input() title = 'Upload files';
  @Input() description = '';
  @Input() buttonText = 'Add file';
  @Input() accept: string[] = [];
  @Input() multiple = false;
  @Input() files: Set<File> = new Set();
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() disabled = false;
  @Input() skeleton = false;

  @Output() filesChange = new EventEmitter<Set<File>>();
}
